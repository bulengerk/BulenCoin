# BulenCoin Rust SDK (blocking + async)

Minimal clients for the BulenCoin prototype HTTP APIs (payments, payment links, status,
reward estimation). Blocking and async variants are provided.

## Usage

```toml
[dependencies]
bulencoin-sdk = { path = "../sdk-rs" }
```

```rust
use bulencoin_sdk::{BulenClient, PaymentRequest, build_payment_link};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = BulenClient::new("http://localhost:4100/api")?;
    let payment = client.create_payment(&PaymentRequest {
        to: "merchant-addr".into(),
        amount: 25,
        memo: Some("order-123".into()),
        expires_in_seconds: None,
        webhook_url: None,
    })?;
    println!("payment id: {}", payment.id);

    let link = client.create_payment_link(&bulencoin_sdk::PaymentLinkRequest {
        address: payment.to.clone(),
        amount: payment.amount,
        memo: payment.memo.clone(),
    })?;
    println!("link: {}", link.link);

    let rewards = client.estimate_rewards(&bulencoin_sdk::RewardEstimateRequest {
        stake: 1000,
        uptime_hours_per_day: 24,
        days: 7,
        device_class: Some("server".into()),
    })?;
    println!("weekly: {}", rewards.projection.weekly);

    let local_link = build_payment_link("addr", 10, Some("memo"));
    println!("local link: {}", local_link);
    Ok(())
}
```

Async (Tokio):

```rust
use bulencoin_sdk::{AsyncBulenClient, PaymentRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = AsyncBulenClient::new("http://localhost:4100/api")?;
    let payment = client.create_payment(&PaymentRequest {
        to: "merchant-addr".into(),
        amount: 10,
        memo: None,
        expires_in_seconds: None,
        webhook_url: None,
    }).await?;
    println!("payment {}", payment.id);
    Ok(())
}
```

Notes:

- Blocking client: `BulenClient`; async client: `AsyncBulenClient` (bring your own Tokio runtime).
- Expects BulenNode API base (`/api` prefix).
- See `docs/dev_cookbook.md` for HTTP examples and other languages.
