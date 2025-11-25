//! BulenCoin SDK – minimal helper around the prototype HTTP API.
//! Contains both blocking (`BulenClient`) and async (`AsyncBulenClient`) variants.
use reqwest::blocking::Client;
use reqwest::Client as AsyncClient;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Clone)]
pub struct BulenClient {
    base: Url,
    http: Client,
}

impl BulenClient {
    /// Create a new client with the given API base (e.g. "http://localhost:4100/api").
    pub fn new(base: &str) -> Result<Self, url::ParseError> {
        let base = Url::parse(base)?;
        let http = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("client");
        Ok(Self { base, http })
    }

    /// Create a payment / invoice.
    pub fn create_payment(&self, req: &PaymentRequest) -> Result<PaymentResponse, reqwest::Error> {
        let url = self.base.join("payments").expect("url");
        self.http.post(url).json(req).send()?.error_for_status()?.json()
    }

    /// Fetch payment status by ID.
    pub fn get_payment(&self, id: &str) -> Result<PaymentResponse, reqwest::Error> {
        let url = self
            .base
            .join(&format!("payments/{}", id))
            .expect("url");
        self.http.get(url).send()?.error_for_status()?.json()
    }

    /// Build a payment link and QR (delegates to node).
    pub fn create_payment_link(
        &self,
        req: &PaymentLinkRequest,
    ) -> Result<PaymentLinkResponse, reqwest::Error> {
        let url = self.base.join("payment-link").expect("url");
        self.http.post(url).json(req).send()?.error_for_status()?.json()
    }

    /// Get node status (chain height, stake, reward projections).
    pub fn status(&self) -> Result<NodeStatus, reqwest::Error> {
        let url = self.base.join("status").expect("url");
        self.http.get(url).send()?.error_for_status()?.json()
    }

    /// Estimate rewards for a given stake/uptime window.
    pub fn estimate_rewards(
        &self,
        req: &RewardEstimateRequest,
    ) -> Result<RewardEstimateResponse, reqwest::Error> {
        let url = self.base.join("rewards/estimate").expect("url");
        self.http.post(url).json(req).send()?.error_for_status()?.json()
    }
}

#[derive(Debug, Serialize)]
pub struct PaymentRequest {
    pub to: String,
    pub amount: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PaymentResponse {
    pub id: String,
    pub to: String,
    pub amount: u64,
    pub memo: Option<String>,
    pub status: String,
    pub created_at: String,
    pub expires_at: String,
    pub transaction_id: Option<String>,
    pub block_index: Option<u64>,
    pub webhook_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaymentLinkRequest {
    pub address: String,
    pub amount: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PaymentLinkResponse {
    pub ok: bool,
    pub link: String,
    pub qr_data_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RewardEstimateRequest {
    pub stake: u64,
    pub uptime_hours_per_day: u64,
    pub days: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_class: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RewardEstimateResponse {
    pub ok: bool,
    pub projection: RewardProjection,
}

#[derive(Debug, Deserialize)]
pub struct RewardProjection {
    pub hourly: f64,
    pub daily: f64,
    pub weekly: f64,
    pub period_total: f64,
    pub loyalty_boost: Option<f64>,
    pub device_boost: Option<f64>,
    pub stake_weight: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct NodeStatus {
    pub chain_id: String,
    pub node_id: String,
    pub height: u64,
    pub total_stake: u64,
    pub mempool_size: usize,
    pub reward_projection: Option<RewardProjection>,
}

/// Build a BIP21-like payment link locally.
pub fn build_payment_link(address: &str, amount: u64, memo: Option<&str>) -> String {
  let mut link = format!("bulen:{}?amount={}", address, amount);
  if let Some(m) = memo {
    link.push_str("&memo=");
    link.push_str(&urlencoding::encode(m));
  }
  link
}

/// Async client (bring your own Tokio runtime).
#[derive(Clone)]
pub struct AsyncBulenClient {
    base: Url,
    http: AsyncClient,
}

impl AsyncBulenClient {
    pub fn new(base: &str) -> Result<Self, url::ParseError> {
        let base = Url::parse(base)?;
        let http = AsyncClient::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("client");
        Ok(Self { base, http })
    }

    pub async fn create_payment(
        &self,
        req: &PaymentRequest,
    ) -> Result<PaymentResponse, reqwest::Error> {
        let url = self.base.join("payments").expect("url");
        self.http
            .post(url)
            .json(req)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }

    pub async fn get_payment(&self, id: &str) -> Result<PaymentResponse, reqwest::Error> {
        let url = self.base.join(&format!("payments/{}", id)).expect("url");
        self.http.get(url).send().await?.error_for_status()?.json().await
    }

    pub async fn create_payment_link(
        &self,
        req: &PaymentLinkRequest,
    ) -> Result<PaymentLinkResponse, reqwest::Error> {
        let url = self.base.join("payment-link").expect("url");
        self.http
            .post(url)
            .json(req)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }

    pub async fn status(&self) -> Result<NodeStatus, reqwest::Error> {
        let url = self.base.join("status").expect("url");
        self.http.get(url).send().await?.error_for_status()?.json().await
    }

    pub async fn estimate_rewards(
        &self,
        req: &RewardEstimateRequest,
    ) -> Result<RewardEstimateResponse, reqwest::Error> {
        let url = self.base.join("rewards/estimate").expect("url");
        self.http
            .post(url)
            .json(req)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }
}
