use std::net::TcpListener;
use std::process::{Command, Stdio};
use std::time::Duration;
use std::{thread, time};

use bulencoin_sdk::{
    build_payment_link, BulenClient, PaymentLinkRequest, PaymentRequest, RewardEstimateRequest,
};
use tempfile::TempDir;

fn wait_for_health(base: &str, tries: u32) -> bool {
  for _ in 0..tries {
    if let Ok(resp) = reqwest::blocking::get(format!("{}/health", base)) {
      if resp.status().is_success() {
        return true;
      }
    }
    thread::sleep(time::Duration::from_millis(500));
  }
  false
}

fn free_port() -> u16 {
  TcpListener::bind("127.0.0.1:0")
    .expect("bind ephemeral")
    .local_addr()
    .unwrap()
    .port()
}

#[test]
fn sdk_rust_payments_and_links() {
  let tmp = TempDir::new().unwrap();
  let http_port: u16 = free_port();
  let p2p_port: u16 = free_port();
    let data_dir = tmp.path().join("node");
    let mut node = Command::new("node")
        .arg("src/index.js")
        .current_dir("../bulennode")
        .env("NODE_ENV", "test")
        .env("BULEN_HTTP_PORT", http_port.to_string())
        .env("BULEN_P2P_PORT", p2p_port.to_string())
        .env("BULEN_DATA_DIR", data_dir.to_str().unwrap())
        .env("BULEN_ENABLE_FAUCET", "true")
        .env("BULEN_BLOCK_INTERVAL_MS", "700")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("start node");

    let api_base = format!("http://127.0.0.1:{}/api", http_port);
    assert!(wait_for_health(&api_base, 50), "node health");

    let client = BulenClient::new(&api_base).expect("client");

    // fund payer
    reqwest::blocking::Client::new()
        .post(format!("{}/faucet", &api_base))
        .json(&serde_json::json!({"address":"sdk-rs-alice","amount":1000}))
        .send()
        .unwrap();

    // create payment
    let pay = client
        .create_payment(&PaymentRequest {
            to: "sdk-rs-merchant".to_string(),
            amount: 50,
            memo: Some("sdk-rs-order".to_string()),
            expires_in_seconds: Some(300),
            webhook_url: None,
        })
        .expect("create payment");
    assert!(!pay.id.is_empty());

    // build link locally and via node
    let local_link = build_payment_link("sdk-rs-merchant", 50, Some("sdk-rs-order"));
    assert!(local_link.starts_with("bulen:sdk-rs-merchant?amount=50"));
    assert!(local_link.contains("memo=sdk-rs-order"));

    let link_resp = client
        .create_payment_link(&PaymentLinkRequest {
            address: "sdk-rs-merchant".to_string(),
            amount: 50,
            memo: Some("sdk-rs-order".to_string()),
        })
        .expect("payment link");
    assert!(link_resp.ok);
    assert!(link_resp.link.starts_with("bulen:sdk-rs-merchant"));

    // send tx to pay invoice
    reqwest::blocking::Client::new()
        .post(format!("{}/transactions", &api_base))
        .json(&serde_json::json!({
            "from": "sdk-rs-alice",
            "to": "sdk-rs-merchant",
            "amount": 50,
            "fee": 0,
            "memo": "sdk-rs-order"
        }))
        .send()
        .unwrap();

    // wait for paid status
    let mut paid = false;
    for _ in 0..40 {
        let status = client.get_payment(&pay.id).unwrap();
        if status.status == "paid" {
            paid = true;
            break;
        }
        thread::sleep(Duration::from_millis(300));
    }
    assert!(paid, "payment should become paid");

    // reward estimate
    let est = client
        .estimate_rewards(&RewardEstimateRequest {
            stake: 1000,
            uptime_hours_per_day: 24,
            days: 7,
            device_class: Some("desktop".to_string()),
        })
        .expect("estimate");
    assert!(est.ok);

    node.kill().ok();
}
