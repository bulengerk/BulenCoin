use std::{
    collections::{HashMap, HashSet},
    env,
    net::{IpAddr, SocketAddr},
    path::PathBuf,
    sync::{Arc, Mutex, RwLock},
    time::{Duration, Instant, SystemTime},
};

use axum::{
    body::Body,
    extract::{ConnectInfo, Path, State, Query},
    http::{HeaderMap, Request, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
    middleware::Next,
};
use base64::Engine;
use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};
use p256::pkcs8::DecodePublicKey;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use tokio::{task::JoinHandle, time::sleep};
use tower_http::{
    cors::{Any, CorsLayer},
    limit::RequestBodyLimitLayer,
};
use uuid::Uuid;

const ALLOWED_ACTIONS: &[&str] = &["transfer", "stake", "unstake"];

type SharedState = Arc<RwLock<StateData>>;

fn default_action() -> String {
  "transfer".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Transaction {
    id: String,
    from: String,
    to: String,
    amount: u64,
    fee: u64,
    nonce: u64,
    timestamp: String,
    #[serde(default = "default_action")]
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    public_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Account {
    balance: i128,
    stake: i128,
    nonce: u64,
    reputation: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Block {
    index: u64,
    previous_hash: String,
    hash: String,
    timestamp: String,
    producer: String,
    transactions: Vec<Transaction>,
}

#[derive(Clone)]
struct Config {
    chain_id: String,
    node_id: String,
    http_port: u16,
    block_interval_ms: u64,
    data_dir: PathBuf,
    peers: Vec<String>,
    p2p_token: Option<String>,
    require_signatures: bool,
    enable_faucet: bool,
    rate_limit_window_ms: u64,
    rate_limit_max_requests: u32,
    protocol_version: String,
    cors_origins: Vec<String>,
    max_body_bytes: u64,
    reward_weight: f64,
    device_class: String,
    base_uptime_reward_per_hour: f64,
    loyalty_boost_steps: Vec<LoyaltyStep>,
    device_protection_boosts: HashMap<String, f64>,
    peer_sync_interval_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StateData {
    blocks: Vec<Block>,
    accounts: HashMap<String, Account>,
    mempool: Vec<Transaction>,
    produced_blocks: u64,
    #[serde(default)]
    started_at: u64, // unix seconds
    #[serde(default)]
    produced_rewards: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Payment {
    id: String,
    to: String,
    amount: u64,
    memo: Option<String>,
    created_at: String,
    expires_at: String,
    status: String,
    transaction_id: Option<String>,
    block_index: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WalletChallenge {
    id: String,
    address: String,
    public_key: String,
    wallet_type: String,
    nonce: String,
    message: String,
    created_at: String,
    expires_at: String,
    status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WalletSession {
    id: String,
    address: String,
    public_key: String,
    wallet_type: String,
    created_at: String,
    expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WalletStore {
    challenges: Vec<WalletChallenge>,
    sessions: Vec<WalletSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LoyaltyStep {
    days: u64,
    multiplier: f64,
}

#[derive(Debug)]
struct RateLimiter {
    window: Duration,
    max: u32,
    buckets: Mutex<HashMap<IpAddr, (u32, Instant)>>,
}

#[derive(Debug, Clone)]
struct PeerStat {
    height: u64,
    last_seen: u64,
    ok: bool,
    latest_hash: Option<String>,
    failures: u64,
    node_id: Option<String>,
}

impl RateLimiter {
    fn new(window: Duration, max: u32) -> Self {
        Self {
            window,
            max,
            buckets: Mutex::new(HashMap::new()),
        }
    }

    fn check(&self, ip: IpAddr) -> bool {
        let mut buckets = self.buckets.lock().unwrap();
        let now = Instant::now();
        let entry = buckets.entry(ip).or_insert((0, now + self.window));
        if now > entry.1 {
            *entry = (0, now + self.window);
        }
        entry.0 += 1;
        entry.0 <= self.max
    }
}

#[derive(Clone)]
struct AppState {
    config: Config,
    state: SharedState,
    rate_limiter: Arc<RateLimiter>,
    client: Client,
    payments: Arc<Mutex<Vec<Payment>>>,
    wallet_store: Arc<Mutex<WalletStore>>,
    peer_stats: Arc<Mutex<HashMap<String, PeerStat>>>,
}

fn parse_bool_env(name: &str, default: bool) -> bool {
    env::var(name)
        .ok()
        .map(|v| v.to_lowercase())
        .map(|v| matches!(v.as_str(), "1" | "true" | "yes"))
        .unwrap_or(default)
}

fn parse_number_env<T: std::str::FromStr>(name: &str, default: T) -> T {
    env::var(name)
        .ok()
        .and_then(|v| v.parse::<T>().ok())
        .unwrap_or(default)
}

fn parse_peers(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .collect()
}

fn parse_origins(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .collect()
}

fn parse_loyalty_steps(raw: &str) -> Vec<LoyaltyStep> {
    if raw.is_empty() {
        return vec![
            LoyaltyStep {
                days: 30,
                multiplier: 1.05,
            },
            LoyaltyStep {
                days: 180,
                multiplier: 1.1,
            },
            LoyaltyStep {
                days: 365,
                multiplier: 1.2,
            },
        ];
    }
    let mut out = vec![];
    for part in raw.split(',') {
        let mut pieces = part.split(':');
        if let (Some(days), Some(mult)) = (pieces.next(), pieces.next()) {
            if let (Ok(d), Ok(m)) = (days.trim().parse::<u64>(), mult.trim().parse::<f64>()) {
                out.push(LoyaltyStep {
                    days: d,
                    multiplier: m,
                });
            }
        }
    }
    out.sort_by_key(|s| s.days);
    out
}

fn parse_device_boosts(raw: &str) -> HashMap<String, f64> {
    let mut map = HashMap::new();
    if raw.is_empty() {
        map.insert("phone".into(), 1.15);
        map.insert("tablet".into(), 1.1);
        map.insert("raspberry".into(), 1.12);
        return map;
    }
    for part in raw.split(',') {
        let mut pieces = part.split(':');
        if let (Some(cls), Some(mult)) = (pieces.next(), pieces.next()) {
            if let Ok(m) = mult.trim().parse::<f64>() {
                map.insert(cls.trim().to_string(), m);
            }
        }
    }
    map
}

fn now_iso() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn system_time_to_iso(value: u64) -> String {
    let ts = SystemTime::UNIX_EPOCH + Duration::from_secs(value);
    OffsetDateTime::from(ts)
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn compute_block_hash(block: &Block) -> String {
    let mut clone = block.clone();
    clone.hash = String::new();
    let serialized = serde_json::to_string(&clone).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(serialized.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn protocol_major(version: &str) -> u32 {
    version
        .split('.')
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
}

fn compute_loyalty_boost(config: &Config, uptime_seconds: u64) -> f64 {
    let days = uptime_seconds as f64 / 86_400f64;
    let mut boost = 1.0;
    for step in &config.loyalty_boost_steps {
        if days >= step.days as f64 {
            boost = step.multiplier;
        }
    }
    boost
}

fn compute_device_boost(config: &Config) -> f64 {
    config
        .device_protection_boosts
        .get(&config.device_class)
        .copied()
        .unwrap_or(1.0)
}

fn parse_rfc3339(value: &str) -> Option<OffsetDateTime> {
    OffsetDateTime::parse(value, &time::format_description::well_known::Rfc3339).ok()
}

fn reward_per_block(config: &Config, uptime_seconds: u64) -> f64 {
    let loyalty = compute_loyalty_boost(config, uptime_seconds);
    let device = compute_device_boost(config);
    let hourly = config.base_uptime_reward_per_hour * config.reward_weight * loyalty * device;
    let blocks_per_hour = 3600.0 / (config.block_interval_ms as f64 / 1000.0);
    if blocks_per_hour <= 0.0 {
        0.0
    } else {
        hourly / blocks_per_hour
    }
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn record_peer_stat(
    stats: &mut HashMap<String, PeerStat>,
    peer: &str,
    height: u64,
    ok: bool,
    hash: Option<String>,
    node_id: Option<String>,
) {
    let entry = stats.entry(peer.to_string()).or_insert(PeerStat {
        height: 0,
        last_seen: 0,
        ok: false,
        latest_hash: None,
        failures: 0,
        node_id: None,
    });
    entry.height = height;
    entry.last_seen = now_unix();
    entry.ok = ok;
    entry.latest_hash = hash;
    entry.node_id = node_id;
    if !ok {
        entry.failures += 1;
    }
}

fn default_config() -> Config {
    let chain_id = env::var("BULEN_CHAIN_ID").unwrap_or_else(|_| "bulencoin-devnet-1".to_string());
    let node_id = env::var("BULEN_NODE_ID").unwrap_or_else(|_| format!("node-rs-{}", Uuid::new_v4()));
    let http_port = parse_number_env("BULEN_HTTP_PORT", 5100u16);
    let block_interval_ms = parse_number_env("BULEN_BLOCK_INTERVAL_MS", 8_000u64);
    let data_dir = env::var("BULEN_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("data-rs"));
    let peers = env::var("BULEN_PEERS").map(|v| parse_peers(&v)).unwrap_or_default();
    let p2p_token = env::var("BULEN_P2P_TOKEN").ok().filter(|v| !v.is_empty());
    let require_signatures = parse_bool_env(
        "BULEN_REQUIRE_SIGNATURES",
        env::var("NODE_ENV").map(|v| v == "production").unwrap_or(false),
    );
    let enable_faucet = parse_bool_env(
        "BULEN_ENABLE_FAUCET",
        env::var("NODE_ENV").map(|v| v != "production").unwrap_or(true),
    );
    let rate_limit_window_ms = parse_number_env("BULEN_RATE_LIMIT_WINDOW_MS", 15_000u64);
    let rate_limit_max_requests = parse_number_env("BULEN_RATE_LIMIT_MAX_REQUESTS", 60u32);
    let protocol_version = env::var("BULEN_PROTOCOL_VERSION").unwrap_or_else(|_| "0.1.0-rs".to_string());
    let cors_origins = env::var("BULEN_CORS_ORIGINS")
        .map(|v| parse_origins(&v))
        .unwrap_or_default();
    let max_body_bytes = parse_number_env("BULEN_MAX_BODY_SIZE_BYTES", 131072u64);
    let reward_weight = parse_number_env("BULEN_REWARD_WEIGHT", 0.8f64);
    let device_class = env::var("BULEN_DEVICE_CLASS").unwrap_or_else(|_| "desktop".to_string());
    let base_uptime_reward_per_hour = parse_number_env("BULEN_BASE_UPTIME_REWARD", 1.0f64);
    let loyalty_boost_steps =
        env::var("BULEN_LOYALTY_STEPS").map(|v| parse_loyalty_steps(&v)).unwrap_or_else(|_| {
            parse_loyalty_steps("")
        });
    let device_protection_boosts =
        env::var("BULEN_DEVICE_PROTECTION").map(|v| parse_device_boosts(&v)).unwrap_or_else(|_| {
            parse_device_boosts("")
        });
    let peer_sync_interval_ms = parse_number_env("BULEN_PEER_SYNC_INTERVAL_MS", 5_000u64);

    Config {
        chain_id,
        node_id,
        http_port,
        block_interval_ms,
        data_dir,
        peers,
        p2p_token,
        require_signatures,
        enable_faucet,
        rate_limit_window_ms,
        rate_limit_max_requests,
        protocol_version,
        cors_origins,
        max_body_bytes,
        reward_weight,
        device_class,
        base_uptime_reward_per_hour,
        loyalty_boost_steps,
        device_protection_boosts,
        peer_sync_interval_ms,
    }
}

fn genesis_block(config: &Config) -> Block {
    Block {
        index: 0,
        previous_hash: "genesis".to_string(),
        hash: "genesis".to_string(),
        timestamp: now_iso(),
        producer: config.node_id.clone(),
        transactions: vec![],
    }
}

fn initial_state(config: &Config) -> StateData {
    StateData {
        blocks: vec![genesis_block(config)],
        accounts: HashMap::new(),
        mempool: Vec::new(),
        produced_blocks: 0,
        produced_rewards: 0.0,
        started_at: SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    }
}

fn payments_file(config: &Config) -> PathBuf {
    config.data_dir.join("payments.json")
}

fn load_payments(config: &Config) -> Vec<Payment> {
    if let Ok(content) = std::fs::read_to_string(payments_file(config)) {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(arr) = parsed.get("payments").and_then(|v| v.as_array()) {
                let mut out = vec![];
                for item in arr {
                    if let Ok(p) = serde_json::from_value::<Payment>(item.clone()) {
                        out.push(p);
                    }
                }
                return out;
            }
        }
    }
    vec![]
}

fn save_payments(config: &Config, payments: &[Payment]) {
    std::fs::create_dir_all(&config.data_dir).ok();
    let data = serde_json::json!({ "payments": payments });
    let _ = std::fs::write(payments_file(config), serde_json::to_string_pretty(&data).unwrap());
}

fn wallet_file(config: &Config) -> PathBuf {
    config.data_dir.join("wallet_sessions.json")
}

fn load_wallet_store(config: &Config) -> WalletStore {
    if let Ok(content) = std::fs::read_to_string(wallet_file(config)) {
        if let Ok(parsed) = serde_json::from_str::<WalletStore>(&content) {
            return parsed;
        }
    }
    WalletStore {
        challenges: vec![],
        sessions: vec![],
    }
}

fn save_wallet_store(config: &Config, store: &WalletStore) {
    std::fs::create_dir_all(&config.data_dir).ok();
    let _ = std::fs::write(wallet_file(config), serde_json::to_string_pretty(store).unwrap());
}

fn load_state(config: &Config) -> StateData {
    std::fs::create_dir_all(&config.data_dir).ok();
    let path = config.data_dir.join("state.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(state) = serde_json::from_str::<StateData>(&content) {
            return state;
        }
    }
    initial_state(config)
}

fn save_state(config: &Config, state: &StateData) {
    let path = config.data_dir.join("state.json");
    if let Ok(serialized) = serde_json::to_string_pretty(state) {
        let _ = std::fs::write(path, serialized);
    }
}

fn derive_address(public_key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(public_key.as_bytes());
    let hash = hasher.finalize();
    let hex = format!("{:x}", hash);
    let short = &hex[..40.min(hex.len())];
    format!("addr_{}", short)
}

fn canonical_payload(tx: &Transaction) -> String {
    serde_json::json!({
        "from": tx.from,
        "to": tx.to,
        "amount": tx.amount,
        "fee": tx.fee,
        "nonce": tx.nonce,
    })
    .to_string()
}

fn verify_signature(config: &Config, state: &StateData, tx: &Transaction) -> Result<(), String> {
    if !config.require_signatures {
        return Ok(());
    }
    let public_key = tx.public_key.as_ref().ok_or("missing publicKey")?;
    let signature_b64 = tx.signature.as_ref().ok_or("missing signature")?;

    let expected_address = derive_address(public_key);
    if tx.from != expected_address {
        return Err("from does not match publicKey".to_string());
    }

    let signature_bytes = base64::engine::general_purpose::STANDARD
        .decode(signature_b64.as_bytes())
        .map_err(|_| "invalid signature encoding")?;
    let signature = Signature::from_der(&signature_bytes).map_err(|_| "invalid signature")?;
    let verifying_key =
        VerifyingKey::from_public_key_pem(public_key).map_err(|_| "invalid publicKey pem")?;

    verifying_key
        .verify(canonical_payload(tx).as_bytes(), &signature)
        .map_err(|_| "signature verification failed")?;

    let current_nonce = state.accounts.get(&tx.from).map(|a| a.nonce).unwrap_or(0);
    if tx.nonce != current_nonce + 1 {
        return Err(format!(
            "invalid nonce: expected {}, got {}",
            current_nonce + 1,
            tx.nonce
        ));
    }

    Ok(())
}

fn validate_transaction(state: &StateData, tx: &Transaction) -> Result<(), String> {
    let action = tx.action.as_str();
    if !ALLOWED_ACTIONS.contains(&action) {
        return Err("Invalid action".into());
    }
    if tx.amount == 0 {
        return Err("amount must be > 0".to_string());
    }
    if tx.from.is_empty() || tx.to.is_empty() {
        return Err("missing from/to".to_string());
    }
    let from = state.accounts.get(&tx.from).cloned().unwrap_or(Account {
        balance: 0,
        stake: 0,
        nonce: 0,
        reputation: 0,
    });
    if tx.nonce != from.nonce + 1 {
        return Err(format!(
            "invalid nonce: expected {}, got {}",
            from.nonce + 1,
            tx.nonce
        ));
    }
    if action == "transfer" || action == "stake" {
        let total = tx
            .amount
            .checked_add(tx.fee)
            .ok_or_else(|| "amount overflow".to_string())?;
        if from.balance < total as i128 {
            return Err("insufficient balance".to_string());
        }
    }
    if action == "unstake" {
        if from.stake < tx.amount as i128 {
            return Err("insufficient stake".to_string());
        }
        if from.balance < tx.fee as i128 {
            return Err("insufficient balance for fee".to_string());
        }
    }
    Ok(())
}

fn apply_transaction(state: &mut StateData, tx: &Transaction) -> Result<(), String> {
    validate_transaction(state, tx)?;

    state.accounts.entry(tx.from.clone()).or_insert(Account {
        balance: 0,
        stake: 0,
        nonce: 0,
        reputation: 0,
    });
    state.accounts.entry(tx.to.clone()).or_insert(Account {
        balance: 0,
        stake: 0,
        nonce: 0,
        reputation: 0,
    });

    if tx.from == tx.to && tx.action == "transfer" {
        let from = state.accounts.get_mut(&tx.from).expect("sender exists");
        from.balance -= tx.fee as i128;
        from.nonce += 1;
        return Ok(());
    }

    match tx.action.as_str() {
        "transfer" => {
            let total = tx.amount + tx.fee;
            {
                let from = state.accounts.get_mut(&tx.from).expect("sender exists");
                from.balance -= total as i128;
                from.nonce += 1;
            }
            let to = state.accounts.get_mut(&tx.to).expect("receiver exists");
            to.balance += tx.amount as i128;
        }
        "stake" => {
            let total = tx.amount + tx.fee;
            let from = state.accounts.get_mut(&tx.from).expect("sender exists");
            from.balance -= total as i128;
            from.stake += tx.amount as i128;
            from.nonce += 1;
        }
        "unstake" => {
            let from = state.accounts.get_mut(&tx.from).expect("sender exists");
            from.stake -= tx.amount as i128;
            from.balance += tx.amount as i128;
            from.balance -= tx.fee as i128;
            from.nonce += 1;
        }
        _ => {}
    }
    Ok(())
}

fn apply_block(config: &Config, state: &mut StateData, block: &Block) -> Result<(), String> {
    let expected_index = state.blocks.len() as u64;
    let prev_hash = state
        .blocks
        .last()
        .map(|b| b.hash.clone())
        .unwrap_or_else(|| "genesis".into());
    if block.index != expected_index {
        return Err("invalid block index".to_string());
    }
    if block.previous_hash != prev_hash {
        return Err("previous hash mismatch".to_string());
    }
    for tx in &block.transactions {
        if let Err(err) = apply_transaction(state, tx) {
            eprintln!("Skipping invalid tx {} in block {}: {}", tx.id, block.index, err);
            continue;
        }
    }
    // Reward producer with uptime-based reward and reputation bump
    let uptime_seconds = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH + Duration::from_secs(state.started_at))
        .unwrap_or_default()
        .as_secs();
    let reward = reward_per_block(config, uptime_seconds);
    let producer = state
        .accounts
        .entry(block.producer.clone())
        .or_insert(Account {
            balance: 0,
            stake: 0,
            nonce: 0,
            reputation: 0,
        });
    producer.balance += reward as i128;
    producer.reputation += 1;
    state.produced_rewards += reward;
    Ok(())
}

fn normalize_memo(memo: &Option<String>) -> Option<String> {
    memo.as_ref().map(|m| m.chars().take(256).collect())
}

fn find_matching_transaction(payment: &Payment, state: &StateData) -> Option<(String, Option<u64>)> {
    let match_fn = |tx: &Transaction| -> bool {
        tx.to == payment.to
            && tx.amount >= payment.amount
            && match &payment.memo {
                Some(memo) => tx
                    .memo
                    .as_ref()
                    .map(|m| m == memo)
                    .unwrap_or(false),
                None => true,
            }
    };
    for block in &state.blocks {
        if let Some(tx) = block.transactions.iter().find(|t| match_fn(t)) {
            return Some((tx.id.clone(), Some(block.index)));
        }
    }
    for tx in &state.mempool {
        if match_fn(tx) {
            return Some((tx.id.clone(), None));
        }
    }
    None
}

fn update_payment_status(payment: &mut Payment, state: &StateData) {
    let now = OffsetDateTime::now_utc();
    let expired = parse_rfc3339(&payment.expires_at)
        .map(|dt| dt < now)
        .unwrap_or(false);
    let match_tx = find_matching_transaction(payment, state);
    match (match_tx, expired) {
        (Some((tx_id, Some(block_idx))), _) => {
            payment.status = "paid".into();
            payment.transaction_id = Some(tx_id);
            payment.block_index = Some(block_idx);
        }
        (Some((tx_id, None)), false) => {
            payment.status = "pending_block".into();
            payment.transaction_id = Some(tx_id);
        }
        (_, true) => {
            payment.status = "expired".into();
            payment.transaction_id = None;
        }
        _ => {}
    }
}

fn rate_limit(app: &AppState, addr: IpAddr) -> Option<Response> {
    if app.rate_limiter.check(addr) {
        None
    } else {
        Some((StatusCode::TOO_MANY_REQUESTS, "Too many requests").into_response())
    }
}

async fn rate_limit_middleware(
    State(app): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    if let Some(resp) = rate_limit(&app, addr.ip()) {
        return resp;
    }
    next.run(request).await
}

fn verify_p2p_headers(config: &Config, headers: &HeaderMap) -> Result<(), Response> {
    if let Some(expected) = &config.p2p_token {
        let token = headers
            .get("x-bulen-p2p-token")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if token != expected {
            return Err((StatusCode::FORBIDDEN, "Forbidden").into_response());
        }
    }
    if headers.get("x-bulen-node-id").is_none() {
        return Err((StatusCode::BAD_REQUEST, "Missing node id").into_response());
    }
    if let Some(remote) = headers
        .get("x-bulen-protocol-version")
        .and_then(|v| v.to_str().ok())
    {
        let local = protocol_major(&config.protocol_version);
        let remote_major = protocol_major(remote);
        if local != remote_major {
            return Err((StatusCode::BAD_REQUEST, "Incompatible protocol version").into_response());
        }
    }
    Ok(())
}

#[derive(Deserialize)]
struct BlockListQuery {
    limit: Option<usize>,
    offset: Option<usize>,
}

async fn get_block(
    Path(height): Path<u64>,
    State(app): State<AppState>,
) -> Response {
    let state = app.state.read().unwrap();
    let block = state.blocks.iter().find(|b| b.index == height).cloned();
    match block {
        Some(block) => Json(block).into_response(),
        None => (StatusCode::NOT_FOUND, "block not found").into_response(),
    }
}

async fn list_blocks_paged(
    Query(params): Query<BlockListQuery>,
    State(app): State<AppState>,
) -> impl IntoResponse {
    let state = app.state.read().unwrap();
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    let mut sorted = state.blocks.clone();
    sorted.sort_by(|a, b| b.index.cmp(&a.index));
    let page = sorted
        .into_iter()
        .skip(offset)
        .take(limit)
        .collect::<Vec<_>>();
    Json(serde_json::json!({
        "total": state.blocks.len(),
        "offset": offset,
        "limit": limit,
        "blocks": page
    }))
}

#[derive(Deserialize)]
struct TxInput {
    from: String,
    to: Option<String>,
    amount: u64,
    #[serde(default)]
    fee: u64,
    #[serde(default)]
    nonce: Option<u64>,
    #[serde(default)]
    public_key: Option<String>,
    #[serde(default)]
    signature: Option<String>,
    #[serde(default)]
    memo: Option<String>,
    #[serde(default)]
    action: Option<String>,
}

#[axum::debug_handler]
async fn post_transaction(
    State(app): State<AppState>,
    Json(payload): Json<TxInput>,
) -> Response {
    // Rate limit handled by middleware.
    if payload.amount == 0 {
        return (StatusCode::BAD_REQUEST, "amount must be > 0").into_response();
    }
    let tx = {
        let state = app.state.read().unwrap();
        let current_nonce = state
            .accounts
            .get(&payload.from)
            .map(|a| a.nonce)
            .unwrap_or(0);
        let memo = normalize_memo(&payload.memo);
        if payload.memo.is_some() && memo != payload.memo {
            return (StatusCode::BAD_REQUEST, "memo too long (max 256 chars)").into_response();
        }
        let tx = Transaction {
            id: format!("tx-{}", Uuid::new_v4()),
            from: payload.from,
            to: payload.to.unwrap_or_else(|| "".into()),
            amount: payload.amount,
            fee: payload.fee,
            nonce: payload.nonce.unwrap_or(current_nonce + 1),
            timestamp: now_iso(),
            public_key: payload.public_key,
            signature: payload.signature,
            memo,
            action: payload.action.unwrap_or_else(|| "transfer".into()),
        };
        if let Err(err) = verify_signature(&app.config, &state, &tx) {
            return (StatusCode::BAD_REQUEST, err).into_response();
        }
        if let Err(err) = validate_transaction(&state, &tx) {
            return (StatusCode::BAD_REQUEST, err).into_response();
        }
        tx
    };

    {
        let mut state = app.state.write().unwrap();
        state.mempool.push(tx.clone());
    }

    broadcast_transaction(app.clone(), tx.clone()).await;
    Json(tx).into_response()
}

#[derive(Deserialize)]
struct FaucetInput {
    address: String,
    amount: Option<u64>,
}

async fn faucet(
    State(app): State<AppState>,
    Json(input): Json<FaucetInput>,
) -> Response {
    // Rate limit handled by middleware.
    if !app.config.enable_faucet {
        return (StatusCode::FORBIDDEN, "Faucet disabled").into_response();
    }
    if input.address.is_empty() {
        return (StatusCode::BAD_REQUEST, "missing address").into_response();
    }
    let amount = input.amount.unwrap_or(1000);
    if amount == 0 {
        return (StatusCode::BAD_REQUEST, "invalid amount").into_response();
    }
    let mut state = app.state.write().unwrap();
    let entry = state.accounts.entry(input.address.clone()).or_insert(Account {
        balance: 0,
        stake: 0,
        nonce: 0,
        reputation: 0,
    });
    entry.balance += amount as i128;
    let new_balance = entry.balance;
    save_state(&app.config, &state);
    Json(serde_json::json!({
        "ok": true,
        "address": input.address,
        "newBalance": new_balance
    }))
    .into_response()
}

async fn get_account(
    Path(address): Path<String>,
    State(app): State<AppState>,
) -> Response {
    // Rate limit handled by middleware.
    let state = app.state.read().unwrap();
    let account = state.accounts.get(&address).cloned().unwrap_or(Account {
        balance: 0,
        stake: 0,
        nonce: 0,
        reputation: 0,
    });
    Json(account).into_response()
}

#[derive(Deserialize)]
struct PaymentInput {
    to: String,
    amount: u64,
    memo: Option<String>,
    expires_in_seconds: Option<u64>,
}

fn create_payment(input: PaymentInput) -> Result<Payment, String> {
    if input.to.is_empty() {
        return Err("Missing destination address".into());
    }
    if input.amount == 0 {
        return Err("Invalid amount".into());
    }
    let memo = normalize_memo(&input.memo);
    if input.memo.is_some() && memo != input.memo {
        return Err("Memo too long (max 256 chars)".into());
    }
    let now = SystemTime::now();
    let expires = input.expires_in_seconds.unwrap_or(900).max(60);
    let expires_at = now
        .checked_add(Duration::from_secs(expires))
        .and_then(|ts| {
            let secs = ts
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            OffsetDateTime::from_unix_timestamp(secs)
                .ok()
                .and_then(|dt| dt.format(&time::format_description::well_known::Rfc3339).ok())
        })
        .unwrap_or_else(|| now_iso());
    let payment = Payment {
        id: format!("pay_{}", Uuid::new_v4().as_simple()),
        to: input.to,
        amount: input.amount,
        memo,
        created_at: now_iso(),
        expires_at,
        status: "pending".into(),
        transaction_id: None,
        block_index: None,
    };
    Ok(payment)
}

fn update_payments(app: &AppState) {
    let state = app.state.read().unwrap();
    let mut payments = app.payments.lock().unwrap();
    let mut changed = false;
    for p in payments.iter_mut() {
        let before = p.status.clone();
        update_payment_status(p, &state);
        if p.status != before {
            changed = true;
        }
    }
    if changed {
        save_payments(&app.config, &payments);
    }
}

async fn post_payment(State(app): State<AppState>, Json(input): Json<PaymentInput>) -> Response {
    let payment = match create_payment(input) {
        Ok(p) => p,
        Err(err) => return (StatusCode::BAD_REQUEST, err).into_response(),
    };
    {
        let mut payments = app.payments.lock().unwrap();
        payments.push(payment.clone());
        save_payments(&app.config, &payments);
    }
    Json(payment).into_response()
}

async fn get_payment(
    Path(id): Path<String>,
    State(app): State<AppState>,
) -> Response {
    update_payments(&app);
    let payments = app.payments.lock().unwrap();
    if let Some(p) = payments.iter().find(|p| p.id == id) {
        return Json(p).into_response();
    }
    (StatusCode::NOT_FOUND, "Payment not found").into_response()
}

async fn status(
    State(app): State<AppState>,
) -> impl IntoResponse {
    let state = app.state.read().unwrap();
    let latest = state.blocks.last();
    let height = latest.map(|b| b.index).unwrap_or(0);
    let latest_hash = latest.map(|b| b.hash.clone());
    let accounts_total = state.accounts.len();
    let mempool_size = state.mempool.len();
    let uptime_seconds = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH + Duration::from_secs(state.started_at))
        .unwrap_or_default()
        .as_secs();
    let total_stake: i128 = state.accounts.values().map(|a| a.stake).sum();
    let loyalty_boost = compute_loyalty_boost(&app.config, uptime_seconds);
    let device_boost = compute_device_boost(&app.config);
    let hourly = app.config.base_uptime_reward_per_hour
        * app.config.reward_weight
        * loyalty_boost
        * device_boost;
    let total = (uptime_seconds as f64 / 3600.0) * hourly;
    let payments = app.payments.lock().unwrap();
    let payments_pending = payments.iter().filter(|p| p.status == "pending").count();

    Json(serde_json::json!({
        "chainId": app.config.chain_id,
        "nodeId": app.config.node_id,
        "height": height,
        "latestHash": latest_hash,
        "mempoolSize": mempool_size,
        "accountsCount": accounts_total,
        "totalStake": total_stake,
        "protocolVersion": app.config.protocol_version,
        "rewardWeight": app.config.reward_weight,
        "deviceClass": app.config.device_class,
        "metrics": {
            "startedAt": system_time_to_iso(state.started_at),
            "uptimeSeconds": uptime_seconds,
            "producedBlocks": state.produced_blocks,
            "uptimeRewardEstimateHourly": hourly,
            "uptimeRewardEstimateTotal": total,
            "loyaltyBoost": loyalty_boost,
            "deviceBoost": device_boost,
            "producedRewards": state.produced_rewards,
        },
        "payments": {
            "total": payments.len(),
            "pending": payments_pending,
        },
    }))
    .into_response()
}

async fn metrics(
    State(app): State<AppState>,
) -> impl IntoResponse {
    let state = app.state.read().unwrap();
    let latest_height = state.blocks.last().map(|b| b.index).unwrap_or(0);
    let accounts_total = state.accounts.len();
    let mempool_size = state.mempool.len();
    let uptime_seconds = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH + Duration::from_secs(state.started_at))
        .unwrap_or_default()
        .as_secs();
    let loyalty_boost = compute_loyalty_boost(&app.config, uptime_seconds);
    let device_boost = compute_device_boost(&app.config);
    let hourly = app.config.base_uptime_reward_per_hour
        * app.config.reward_weight
        * loyalty_boost
        * device_boost;
    let total = (uptime_seconds as f64 / 3600.0) * hourly;
    let payments = app.payments.lock().unwrap();
    let labels = format!(
        "{{chain_id=\"{}\",node_id=\"{}\"}}",
        app.config.chain_id, app.config.node_id
    );
    let mut out = String::new();
    out.push_str(&format!("bulen_blocks_height{} {}\n", labels, latest_height));
    out.push_str(&format!("bulen_mempool_size{} {}\n", labels, mempool_size));
    out.push_str(&format!("bulen_accounts_total{} {}\n", labels, accounts_total));
    out.push_str(&format!("bulen_uptime_seconds{} {}\n", labels, uptime_seconds));
    out.push_str(&format!("bulen_blocks_produced{} {}\n", labels, state.produced_blocks));
    out.push_str(&format!(
        "bulen_config_rate_limit_window_ms{} {}\n",
        labels, app.config.rate_limit_window_ms
    ));
    out.push_str(&format!(
        "bulen_config_rate_limit_max_requests{} {}\n",
        labels, app.config.rate_limit_max_requests
    ));
    out.push_str(&format!(
        "bulen_peers_count{} {}\n",
        labels,
        app.config.peers.len()
    ));
    out.push_str(&format!(
        "bulen_reward_weight{} {}\n",
        labels, app.config.reward_weight
    ));
    out.push_str(&format!(
        "bulen_reward_estimate_hourly{} {}\n",
        labels, hourly
    ));
    out.push_str(&format!(
        "bulen_reward_estimate_total{} {}\n",
        labels, total
    ));
    out.push_str(&format!(
        "bulen_loyalty_boost{} {}\n",
        labels, loyalty_boost
    ));
    out.push_str(&format!(
        "bulen_device_boost{} {}\n",
        labels, device_boost
    ));
    out.push_str(&format!(
        "bulen_rewards_produced{} {}\n",
        labels, state.produced_rewards
    ));
    out.push_str(&format!(
        "bulen_payments_total{} {}\n",
        labels, payments.len()
    ));
    out.push_str(&format!(
        "bulen_payments_pending{} {}\n",
        labels,
        payments.iter().filter(|p| p.status == "pending").count()
    ));
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/plain; version=0.0.4")
        .body(Body::from(out))
        .unwrap()
}

async fn health(
    State(_app): State<AppState>,
) -> impl IntoResponse {
    // Rate limit handled by middleware.
    Json(serde_json::json!({ "status": "ok" })).into_response()
}

async fn info(State(app): State<AppState>) -> impl IntoResponse {
    let state = app.state.read().unwrap();
    Json(serde_json::json!({
        "version": app.config.protocol_version,
        "chainId": app.config.chain_id,
        "nodeId": app.config.node_id,
        "requireSignatures": app.config.require_signatures,
        "enableFaucet": app.config.enable_faucet,
        "protocolMajor": protocol_major(&app.config.protocol_version),
        "height": state.blocks.last().map(|b| b.index).unwrap_or(0),
        "nodeRole": "validator",
        "nodeProfile": "rust-prototype"
    }))
}

fn prune_wallet_store(store: &mut WalletStore) {
    let now = OffsetDateTime::now_utc();
    store.challenges.retain(|c| {
        parse_rfc3339(&c.expires_at).map(|dt| dt > now).unwrap_or(false)
    });
    store.sessions.retain(|s| {
        parse_rfc3339(&s.expires_at).map(|dt| dt > now).unwrap_or(false)
    });
}

#[derive(Deserialize)]
struct WalletChallengeInput {
    address: String,
    public_key: String,
    wallet_type: Option<String>,
}

async fn wallets_challenge(
    State(app): State<AppState>,
    Json(input): Json<WalletChallengeInput>,
) -> Response {
    if input.address.is_empty() || input.public_key.is_empty() {
        return (StatusCode::BAD_REQUEST, "Missing address or publicKey").into_response();
    }
    let mut store = app.wallet_store.lock().unwrap();
    let now = OffsetDateTime::now_utc();
    let expires_at = (now + Duration::from_secs(600))
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| now_iso());
    let nonce = Uuid::new_v4().to_string();
    let message = format!(
        "Sign this message to prove wallet ownership for BulenCoin.\nAddress: {}\nWallet: {}\nNonce: {}\nIssued At: {}",
        input.address,
        input.wallet_type.clone().unwrap_or_else(|| "unknown".into()),
        nonce,
        now_iso()
    );
    let challenge = WalletChallenge {
        id: format!("chal_{}", Uuid::new_v4().as_simple()),
        address: input.address,
        public_key: input.public_key,
        wallet_type: input.wallet_type.unwrap_or_else(|| "unknown".into()),
        nonce,
        message: message.clone(),
        created_at: now_iso(),
        expires_at,
        status: "pending".into(),
    };
    store.challenges.push(challenge.clone());
    save_wallet_store(&app.config, &store);
    Json(serde_json::json!({
        "id": challenge.id,
        "message": challenge.message,
        "expiresAt": challenge.expires_at
    }))
    .into_response()
}

#[derive(Deserialize)]
struct WalletVerifyInput {
    challenge_id: String,
    signature: String,
}

fn verify_wallet_signature(challenge: &WalletChallenge, signature_b64: &str) -> bool {
    let signature_bytes = match base64::engine::general_purpose::STANDARD.decode(signature_b64) {
        Ok(b) => b,
        Err(_) => return false,
    };
    let signature = match Signature::from_der(&signature_bytes) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let key = match VerifyingKey::from_public_key_pem(&challenge.public_key) {
        Ok(k) => k,
        Err(_) => return false,
    };
    key.verify(challenge.message.as_bytes(), &signature).is_ok()
}

async fn wallets_verify(
    State(app): State<AppState>,
    Json(input): Json<WalletVerifyInput>,
) -> Response {
    let mut store = app.wallet_store.lock().unwrap();
    prune_wallet_store(&mut store);
    let challenge = match store.challenges.iter_mut().find(|c| c.id == input.challenge_id) {
        Some(c) => c,
        None => return (StatusCode::BAD_REQUEST, "Challenge not found or expired").into_response(),
    };
    if challenge.status == "verified" {
        return (StatusCode::BAD_REQUEST, "Challenge already used").into_response();
    }
    if !verify_wallet_signature(challenge, &input.signature) {
        return (StatusCode::BAD_REQUEST, "Invalid signature").into_response();
    }
    challenge.status = "verified".into();
    let now = OffsetDateTime::now_utc();
    let session = WalletSession {
        id: format!("sess_{}", Uuid::new_v4().as_simple()),
        address: challenge.address.clone(),
        public_key: challenge.public_key.clone(),
        wallet_type: challenge.wallet_type.clone(),
        created_at: now_iso(),
        expires_at: (now + Duration::from_secs(24 * 3600))
            .format(&time::format_description::well_known::Rfc3339)
            .unwrap_or_else(|_| now_iso()),
    };
    store.sessions.push(session.clone());
    save_wallet_store(&app.config, &store);
    Json(serde_json::json!({
        "sessionId": session.id,
        "address": session.address,
        "expiresAt": session.expires_at
    }))
    .into_response()
}

async fn wallets_session(
    Path(id): Path<String>,
    State(app): State<AppState>,
) -> Response {
    let mut store = app.wallet_store.lock().unwrap();
    prune_wallet_store(&mut store);
    if let Some(sess) = store.sessions.iter().find(|s| s.id == id) {
        return Json(sess).into_response();
    }
    (StatusCode::NOT_FOUND, "Session not found or expired").into_response()
}

async fn wallets_info(State(app): State<AppState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "chainId": app.config.chain_id,
        "chainName": "BulenCoin Devnet",
        "rpcUrl": format!("http://localhost:{}/api", app.config.http_port),
        "connectors": [
            {"type": "metamask"},
            {"type": "walletconnect"},
            {"type": "ledger"}
        ]
    }))
}

async fn p2p_tx(
    State(app): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Response {
    if let Err(resp) = verify_p2p_headers(&app.config, &headers) {
        return resp;
    }
    let tx: Transaction = match serde_json::from_value(
        payload
            .get("transaction")
            .cloned()
            .unwrap_or(serde_json::Value::Null),
    ) {
        Ok(tx) => tx,
        Err(_) => return (StatusCode::BAD_REQUEST, "bad tx payload").into_response(),
    };
    let mut state = app.state.write().unwrap();
    if state.mempool.iter().any(|t| t.id == tx.id) {
        return Json(serde_json::json!({ "ok": true, "ignored": true })).into_response();
    }
    state.mempool.push(tx);
    Json(serde_json::json!({ "ok": true })).into_response()
}

async fn p2p_block(
    State(app): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Response {
    if let Err(resp) = verify_p2p_headers(&app.config, &headers) {
        return resp;
    }
    let block: Block = match serde_json::from_value(
        payload
            .get("block")
            .cloned()
            .unwrap_or(serde_json::Value::Null),
    ) {
        Ok(block) => block,
        Err(_) => return (StatusCode::BAD_REQUEST, "bad block payload").into_response(),
    };

    let mut state = app.state.write().unwrap();
    let mut incoming = block.clone();
    incoming.hash = String::new();
    let expected_hash = compute_block_hash(&incoming);
    if block.hash != expected_hash {
        return (StatusCode::BAD_REQUEST, "invalid block hash").into_response();
    }
    if state.blocks.iter().any(|b| b.hash == block.hash) {
        return Json(serde_json::json!({ "ok": true, "ignored": true })).into_response();
    }
    if let Err(err) = apply_block(&app.config, &mut state, &block) {
        drop(state);
        let peer_host = headers
            .get("host")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());
        if let Some(host) = peer_host {
            let app_clone = app.clone();
            tokio::spawn(async move {
                sync_with_peer(app_clone, format!("http://{}", host)).await;
            });
        }
        return (StatusCode::BAD_REQUEST, err).into_response();
    }
    let included: HashSet<String> = block.transactions.iter().map(|t| t.id.clone()).collect();
    state.mempool.retain(|t| !included.contains(&t.id));
    state.blocks.push(block);
    save_state(&app.config, &state);
    drop(state);
    update_payments(&app);
    Json(serde_json::json!({ "ok": true })).into_response()
}

async fn broadcast_transaction(app: AppState, tx: Transaction) {
    if app.config.peers.is_empty() {
        return;
    }
    let payload = serde_json::json!({
        "transaction": tx,
    });
    for peer in app.config.peers.clone() {
        let client = app.client.clone();
        let payload = payload.clone();
        let token = app.config.p2p_token.clone();
        let proto = app.config.protocol_version.clone();
        let node_id = app.config.node_id.clone();
        tokio::spawn(async move {
            let mut req = client
                .post(format!("{}/p2p/tx", peer))
                .header("x-bulen-protocol-version", proto)
                .header("x-bulen-node-id", node_id);
            if let Some(t) = token.as_ref() {
                req = req.header("x-bulen-p2p-token", t);
            }
            let _ = req.json(&payload).send().await;
        });
    }
}

async fn broadcast_block(app: AppState, block: Block) {
    if app.config.peers.is_empty() {
        return;
    }
    let payload = serde_json::json!({
        "block": block,
    });
    for peer in app.config.peers.clone() {
        let client = app.client.clone();
        let payload = payload.clone();
        let token = app.config.p2p_token.clone();
        let proto = app.config.protocol_version.clone();
        let node_id = app.config.node_id.clone();
        tokio::spawn(async move {
            let mut req = client
                .post(format!("{}/p2p/block", peer))
                .header("x-bulen-protocol-version", proto)
                .header("x-bulen-node-id", node_id);
            if let Some(t) = token.as_ref() {
                req = req.header("x-bulen-p2p-token", t);
            }
            let _ = req.json(&payload).send().await;
        });
    }
}

async fn fetch_block_from_peer(
    app: &AppState,
    peer: &str,
    height: u64,
) -> Result<Block, String> {
    let mut req = app
        .client
        .get(format!("{}/api/blocks/{}", peer, height))
        .header("x-bulen-protocol-version", &app.config.protocol_version)
        .header("x-bulen-node-id", &app.config.node_id);
    if let Some(t) = app.config.p2p_token.as_ref() {
        req = req.header("x-bulen-p2p-token", t);
    }
    req = req.timeout(Duration::from_secs(5));
    let resp = req.send().await.map_err(|_| "fetch failed".to_string())?;
    if !resp.status().is_success() {
        return Err(format!("status {}", resp.status()));
    }
    resp.json::<Block>()
        .await
        .map_err(|_| "decode block failed".into())
}

async fn fetch_status_from_peer(
    app: &AppState,
    peer: &str,
) -> Result<(u64, Option<String>, Option<String>), String> {
    let mut req = app
        .client
        .get(format!("{}/api/status", peer))
        .header("x-bulen-protocol-version", &app.config.protocol_version)
        .header("x-bulen-node-id", &app.config.node_id);
    if let Some(t) = app.config.p2p_token.as_ref() {
        req = req.header("x-bulen-p2p-token", t);
    }
    req = req.timeout(Duration::from_secs(5));
    let resp = req.send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("status {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok((
        json.get("height").and_then(|v| v.as_u64()).unwrap_or(0),
        json.get("latestHash")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        json.get("nodeId")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    ))
}

async fn sync_with_peer(app: AppState, peer: String) {
    let (height, latest_hash, node_id) = match fetch_status_from_peer(&app, &peer).await {
        Ok(res) => res,
        Err(_) => {
            let mut stats = app.peer_stats.lock().unwrap();
            record_peer_stat(&mut stats, &peer, 0, false, None, None);
            return;
        }
    };
    {
        let mut stats = app.peer_stats.lock().unwrap();
        record_peer_stat(&mut stats, &peer, height, true, latest_hash.clone(), node_id);
    }
    let local_height = {
        let state = app.state.read().unwrap();
        state.blocks.last().map(|b| b.index).unwrap_or(0)
    };
    if height <= local_height {
        return;
    }
    for h in (local_height + 1)..=height {
        match fetch_block_from_peer(&app, &peer, h).await {
            Ok(block) => {
                let mut state = app.state.write().unwrap();
                if let Err(err) = apply_block(&app.config, &mut state, &block) {
                    eprintln!("failed to sync block {} from {}: {}", h, peer, err);
                    break;
                }
                let included: HashSet<String> =
                    block.transactions.iter().map(|t| t.id.clone()).collect();
                state.mempool.retain(|t| !included.contains(&t.id));
                state.blocks.push(block);
                save_state(&app.config, &state);
            }
            Err(err) => {
                eprintln!("failed to fetch block {} from {}: {}", h, peer, err);
                break;
            }
        }
    }
}

fn spawn_peer_sync(app: AppState) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            let peers = app.config.peers.clone();
            for peer in peers {
                let app_clone = app.clone();
                sync_with_peer(app_clone, peer).await;
            }
            sleep(Duration::from_millis(app.config.peer_sync_interval_ms)).await;
        }
    })
}

fn spawn_block_producer(app: AppState) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            sleep(Duration::from_millis(app.config.block_interval_ms)).await;
            let maybe_block = {
                let mut guard = app.state.write().unwrap();
                if guard.mempool.is_empty() {
                    None
                } else {
                    let txs = guard.mempool.drain(..).collect::<Vec<_>>();
                    let previous_hash = guard
                        .blocks
                        .last()
                        .map(|b| b.hash.clone())
                        .unwrap_or_else(|| "genesis".into());
                    let mut block = Block {
                        index: guard.blocks.len() as u64,
                        previous_hash,
                        hash: String::new(),
                        timestamp: now_iso(),
                        producer: app.config.node_id.clone(),
                        transactions: txs,
                    };
                    // Apply to ensure validity
                    if let Err(err) = apply_block(&app.config, &mut guard, &block) {
                        eprintln!("failed to apply produced block: {}", err);
                        None
                    } else {
                        block.hash = compute_block_hash(&block);
                        guard.blocks.push(block.clone());
                        guard.produced_blocks += 1;
                        save_state(&app.config, &guard);
                        Some(block)
                    }
                }
            };

            if let Some(block) = maybe_block {
                broadcast_block(app.clone(), block).await;
                update_payments(&app);
            }
        }
    })
}

fn build_router(app_state: AppState) -> Router {
    let cors = if app_state.config.cors_origins.is_empty() {
        CorsLayer::new().allow_origin(Any).allow_methods(Any)
    } else {
        let origins = app_state
            .config
            .cors_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect::<Vec<_>>();
        CorsLayer::new().allow_origin(origins).allow_methods(Any)
    };

    Router::new()
        .route("/healthz", get(health))
        .route("/api/health", get(health))
        .route("/api/info", get(info))
        .route("/api/status", get(status))
        .route("/api/accounts/:address", get(get_account))
        .route("/api/transactions", post(post_transaction))
        .route("/api/blocks", get(list_blocks_paged))
        .route("/api/blocks/:height", get(get_block))
        .route("/api/faucet", post(faucet))
        .route("/api/payments", post(post_payment))
        .route("/api/payments/:id", get(get_payment))
        .route("/api/wallets/info", get(wallets_info))
        .route("/api/wallets/challenge", post(wallets_challenge))
        .route("/api/wallets/verify", post(wallets_verify))
        .route("/api/wallets/session/:id", get(wallets_session))
        .route("/p2p/tx", post(p2p_tx))
        .route("/p2p/block", post(p2p_block))
        .route("/metrics", get(metrics))
        .layer(RequestBodyLimitLayer::new(
            app_state.config.max_body_bytes.try_into().unwrap_or(131072usize),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            rate_limit_middleware,
        ))
        .with_state(app_state)
        .layer(cors)
}

#[tokio::main]
async fn main() {
    let config = default_config();
    let state = load_state(&config);
    let payments = load_payments(&config);
    let wallet_store = load_wallet_store(&config);
    let app_state = AppState {
        config: config.clone(),
        state: Arc::new(RwLock::new(state)),
        rate_limiter: Arc::new(RateLimiter::new(
            Duration::from_millis(config.rate_limit_window_ms),
            config.rate_limit_max_requests,
        )),
        client: Client::new(),
        payments: Arc::new(Mutex::new(payments)),
        wallet_store: Arc::new(Mutex::new(wallet_store)),
        peer_stats: Arc::new(Mutex::new(HashMap::new())),
    };

    spawn_block_producer(app_state.clone());
    spawn_peer_sync(app_state.clone());

    let router = build_router(app_state.clone());
    let addr = SocketAddr::from(([0, 0, 0, 0], config.http_port));
    println!(
        "bulennode-rs listening on http://{} (chain={}, node={}, peers={})",
        addr,
        config.chain_id,
        config.node_id,
        config.peers.join(",")
    );

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener");

    if let Err(err) = axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    {
        eprintln!("server error: {}", err);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::Duration;

    async fn start_test_server() -> (SocketAddr, JoinHandle<()>) {
        let mut config = default_config();
        config.http_port = 0;
        config.data_dir = std::env::temp_dir().join(format!("bulen-rs-test-{}", Uuid::new_v4()));
        config.block_interval_ms = 200;
        config.enable_faucet = true;
        config.require_signatures = false;
        let state = load_state(&config);
        let app_state = AppState {
        config: config.clone(),
        state: Arc::new(RwLock::new(state)),
        rate_limiter: Arc::new(RateLimiter::new(
            Duration::from_millis(config.rate_limit_window_ms),
            config.rate_limit_max_requests,
        )),
        client: Client::new(),
        payments: Arc::new(Mutex::new(load_payments(&config))),
        wallet_store: Arc::new(Mutex::new(load_wallet_store(&config))),
        peer_stats: Arc::new(Mutex::new(HashMap::new())),
    };

        let router = build_router(app_state.clone());
        spawn_block_producer(app_state);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind test listener");
        let addr = listener.local_addr().unwrap();
        let handle = tokio::spawn(async move {
            let _ = axum::serve(
                listener,
                router.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .await;
        });
        (addr, handle)
    }

    #[tokio::test]
    async fn health_and_block_flow() {
        let (addr, handle) = start_test_server().await;
        let base = format!("http://{}", addr);
        let client = reqwest::Client::new();

        let health = client.get(format!("{}/healthz", base)).send().await.unwrap();
        assert!(health.status().is_success());

        let faucet = client
            .post(format!("{}/api/faucet", base))
            .json(&serde_json::json!({"address": "alice", "amount": 1000}))
            .send()
            .await
            .unwrap();
        assert!(faucet.status().is_success());

        let tx = client
            .post(format!("{}/api/transactions", base))
            .json(&serde_json::json!({
                "from": "alice",
                "to": "bob",
                "amount": 10,
                "fee": 1
            }))
            .send()
            .await
            .unwrap();
        assert!(tx.status().is_success());

        tokio::time::sleep(Duration::from_millis(500)).await;

        let blocks: serde_json::Value = client
            .get(format!("{}/api/blocks", base))
            .send()
            .await
            .unwrap()
            .json()
            .await
            .unwrap();
        let list = blocks
            .get("blocks")
            .and_then(|b| b.as_array())
            .cloned()
            .unwrap_or_default();
        assert!(list.len() >= 1);

        handle.abort();
    }

    #[tokio::test]
    async fn stake_and_unstake_and_payments() {
        let (addr, handle) = start_test_server().await;
        let base = format!("http://{}", addr);
        let client = reqwest::Client::new();

        // Fund alice
        client
            .post(format!("{}/api/faucet", base))
            .json(&serde_json::json!({"address": "alice", "amount": 5000}))
            .send()
            .await
            .unwrap();

        // Stake
        let stake = client
            .post(format!("{}/api/transactions", base))
            .json(&serde_json::json!({
                "from": "alice",
                "to": "alice",
                "amount": 1000,
                "fee": 1,
                "action": "stake"
            }))
            .send()
            .await
            .unwrap();
        assert!(stake.status().is_success());

        tokio::time::sleep(Duration::from_millis(400)).await;

        // Unstake
        let unstake = client
            .post(format!("{}/api/transactions", base))
            .json(&serde_json::json!({
                "from": "alice",
                "to": "alice",
                "amount": 500,
                "fee": 1,
                "action": "unstake"
            }))
            .send()
            .await
            .unwrap();
        assert!(unstake.status().is_success());

        // Payment creation
        let pay = client
            .post(format!("{}/api/payments", base))
            .json(&serde_json::json!({
                "to": "bob",
                "amount": 50,
                "memo": "test"
            }))
            .send()
            .await
            .unwrap()
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let payment_id = pay.get("id").and_then(|v| v.as_str()).unwrap().to_string();

        // Pay it
        client
            .post(format!("{}/api/transactions", base))
            .json(&serde_json::json!({
                "from": "alice",
                "to": "bob",
                "amount": 60,
                "fee": 1,
                "memo": "test"
            }))
            .send()
            .await
            .unwrap();

        tokio::time::sleep(Duration::from_millis(600)).await;

        let payment_status = client
            .get(format!("{}/api/payments/{}", base, payment_id))
            .send()
            .await
            .unwrap()
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let status = payment_status.get("status").and_then(|v| v.as_str()).unwrap_or("");
        assert!(status == "paid" || status == "pending_block" || status == "pending");

        handle.abort();
    }
}
