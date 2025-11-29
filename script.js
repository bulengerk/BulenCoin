const translations = {
  en: {
    nav_rewards: 'Rewards',
    nav_overview: 'Overview',
    nav_how: 'How it works',
    nav_nodes: 'Nodes',
    nav_consensus: 'Consensus',
    nav_economics: 'Economics',
    nav_apps: 'Apps',
    nav_community: 'Community',
    nav_partners: 'Partners',
    nav_security: 'Security',
    nav_docs: 'Docs',
    nav_roadmap: 'Roadmap',
    choose_language: 'Language',
    hero_title: 'Run a real node on hardware you already own.',
    hero_subtitle:
      'BulenCoin proves Proof of Stake can live on phones, laptops and servers – you earn for keeping a node online, not for buying mining rigs.',
    hero_cta_run_desktop: 'Run on laptop/desktop',
    hero_cta_run_pi: 'Run on Raspberry Pi',
    hero_cta_docs: 'Docs & downloads',
    hero_cta_whitesheet: 'Whitesheet (PL, PDF)',
    chip_mobile: 'Your phone · laptop · server',
    chip_uptime: 'Earn for staying online',
    chip_nogpu: 'No GPUs or mining rigs required',
    chip_multilingual: 'Docs: PL / EN / ES',
    hero_highlight_api: 'On-chain payments API with memo binding',
    hero_highlight_wallets: 'Wallet challenge/verify for MetaMask, WalletConnect, Ledger',
    hero_highlight_tests: 'Full-stack tests ship with the stack (node + explorer + status)',
    live_title: 'Live endpoints',
    live_subtitle: 'Detected a running node. Open the API, explorer or status page.',
    live_api: 'API',
    live_explorer: 'Explorer',
    live_status: 'Status',
    hero_card1_title: 'Purpose-built for everyday devices',
    hero_card1_body:
      'Phones, laptops and servers secure one network. Install in minutes and let it run quietly in the background.',
    hero_card2_title: 'Rewards for uptime, not hardware',
    hero_card2_body:
      'Payouts weight stake plus device profile; age/loyalty boosts reward nodes that stay online. Zero GPU arms race.',
    hero_card3_title: 'One-command setup',
    hero_card3_body:
      'Installers for desktop/server, Raspberry Pi and light/superlight mobile modes, with tokens/TLS ready for public hosts.',
    how_title: 'How BulenCoin works on any device',
    how_subtitle:
      'Two layers of explanation: plain language for anyone, and a concise technical view for operators.',
    how_simple_title: 'For everyone',
    how_simple_point1:
      'Install BulenNode on a phone, laptop or server and pick a profile (mobile light, desktop/server full, or API gateway).',
    how_simple_point2:
      'Keep the app online; it earns automatic rewards for honest uptime and helps secure the network. No mining rigs required.',
    how_simple_point3:
      'Send/receive payments and stake coins; gateways expose simple HTTP APIs for wallets, shops and explorers.',
    how_simple_point4:
      'Safety basics: back up your seed, set a P2P token on public nodes, use rate limits and (optionally) TLS.',
    how_expert_title: 'For builders & operators',
    how_expert_point1:
      'Lightweight Proof of Stake with small validator committees; selection uses stake, device class weighting (phone/tablet/laptop/server) and reputation.',
    how_expert_point2:
      'Profiles: mobile light keeps headers+recent state; desktop/server full keeps full history; gateway role exposes RPC/REST; superlight phone profile prunes aggressively.',
    how_expert_point3:
      'Rewards are autonomous: block reward + fees are split on-chain each block (burn, ecosystem pool, producer cut, stake-proportional remainder).',
    how_expert_point4:
      'Security knobs: required signatures, P2P tokens + handshake, optional TLS/QUIC, rate limits, faucet off in strict mode; metrics and status endpoints gated by tokens.',
    run_title: 'Run a node on everyday devices',
    run_subtitle:
      'No GPU rigs. Node 18+, small SSD and one command per platform. Designed for laptops, Raspberry Pi/ARM and even light/superlight phone modes.',
    run_card_desktop_pill: 'Laptop / desktop',
    run_card_desktop_title: 'Full node on everyday PCs',
    run_card_desktop_body:
      '2 vCPU, 4 GB RAM, 20–40 GB SSD/NVMe. Reward weight 0.8–1.0. No GPU or data-center hardware needed.',
    run_card_desktop_note:
      'Auto-installs Node.js on Debian/Ubuntu; equivalent macOS/Windows scripts are below.',
    run_card_pi_pill: 'Raspberry Pi / ARM',
    run_card_pi_title: 'Keep a Pi online and earn',
    run_card_pi_body:
      'Pi 4 (4 GB) + microSD/SSD. Reward weight 0.75 with ARM boost. Runs 24/7 behind your router with P2P token and TLS via reverse proxy.',
    run_card_pi_note: 'Uses the same lightweight Node.js client; faucet off for public hosts.',
    run_card_mobile_pill: 'Mobile / superlight',
    run_card_mobile_title: 'Light & superlight for phones',
    run_card_mobile_body:
      'Stores headers + recent state; aggressive pruning to protect battery and data. Runs on Android/iOS in light mode; desktop build can simulate it.',
    run_card_mobile_note:
      'Telemetry and selection weight favour diverse devices; uptime still rewarded.',
    run_chip_one_command: 'One-command installers per OS',
    run_chip_energy: 'Energy-aware defaults, no mining',
    run_chip_reward: 'Rewards scale with device weight, not hardware price',
    run_passive_note:
      'Keep nodes online now to help the network grow — when the product matures, honest uptime can turn into meaningful rewards for early operators. No guaranteed profits.',
    overview_title: '1. What is BulenCoin?',
    overview_intro:
      'BulenCoin is a lightweight Proof of Stake experiment focused on accessibility: to prove that a modern network can be maintained by the widest possible spectrum of devices – from phones and tablets, through laptops and desktops, up to cloud servers.',
    overview_goal:
      'The protocol is designed to be light enough to run in the background on a typical end‑user device, while at the same time offering predictable rewards so that users have a real incentive to keep their node online.',
    overview_layers:
      'The network consists of several logical layers: a peer‑to‑peer gossip layer for blocks and transactions, a Proof of Stake–based consensus layer with randomly sampled validator committees, a data layer with blocks, transactions and account state, and an incentive layer that defines how nodes are rewarded for honest behaviour and uptime.',
    nodes_title: '2. Node types in the BulenCoin network',
    node_mobile_title: '2.1 Mobile light node',
    node_mobile_body1:
      'A mobile light node is an app running on a phone or tablet. Instead of storing the full chain, it keeps block headers and a small slice of the recent state needed to verify its own transactions and participate in consensus.',
    node_mobile_body2:
      'It connects to several full nodes, downloads headers and cryptographic proofs, helps monitor block availability, and can join small validator committees if the user has staked BulenCoin. The app contains strict controls for battery and data usage, including night‑only mode and mobile data limits.',
    node_full_title: '2.2 Desktop & server full node',
    node_full_body1:
      'A full node runs on desktops, laptops or servers and stores the full block history and account state. It validates all transactions and blocks and provides data to light nodes.',
    node_full_body2:
      'Full nodes maintain peer tables, propagate new data, can become block producers when staked, and may expose HTTP/WebSocket APIs to act as gateways for web and mobile apps.',
    node_gateway_title: '2.3 Gateway node',
    node_gateway_body:
      'A gateway node is a full node with public APIs. It is used by exchanges, payment processors and users who only want a wallet. Gateways expose endpoints for submitting transactions, reading balances and querying history, with rate limiting and basic abuse protection.',
    node_wallet_title: '2.4 Ultra‑light wallet node',
    node_wallet_body:
      'On constrained devices, users can run a pure wallet that does not participate in consensus or uptime rewards. It talks to gateways or behaves as a read‑only light client, focusing on key management and user experience.',
    consensus_title: '3. Consensus and incentives',
    consensus_intro:
      'BulenCoin uses a lightweight Proof of Stake mechanism with randomly selected validator committees. Devices lock BulenCoin as stake in order to take part in block production and voting.',
    consensus_selection:
      'In each time slot, the protocol deterministically selects a block producer and a small committee of validators based on previous blocks, stake distribution and node reputation. The committee must jointly sign the block for it to be considered final.',
    consensus_device_type:
      'To encourage diversity, the algorithm can take device type into account. Under‑represented categories (for example mobile phones) receive a slight selection boost, as long as the node has sufficient stake and good uptime history. Reputation scores reduce the chance of misbehaving nodes being selected.',
    rewards_title: '3.1 Reward model',
    rewards_blocks:
      'The reward model combines block rewards, transaction fees and explicit uptime rewards. Block producers and committee members receive a share of the block reward and fees.',
    rewards_uptime:
      'Uptime rewards are calculated over time windows. The network randomly samples nodes and sends simple health checks; nodes that consistently respond earn an additional reward proportional to stake and adjusted by device‑type coefficients, so that modest hardware staying online still earns meaningful income.',
    rewards_slashing:
      'A slashing mechanism penalises double‑signing and other consensus attacks by burning part of the violator’s stake and lowering reputation.',
    apps_title: '4. BulenNode applications',
    apps_modules_title: '4.1 Cross‑platform node architecture',
    apps_modules_body1:
      'The BulenNode client is split into modules: networking (peer discovery and gossip), consensus (Proof of Stake logic), storage (block and state database), wallet (keys and transactions), and resource monitoring (CPU, RAM, bandwidth and battery usage).',
    apps_modules_body2:
      'Platform‑specific code is kept behind stable interfaces, so the same core logic can run on Android, iOS, Windows, macOS and Linux.',
    apps_mobile_title: '4.2 Mobile app',
    apps_mobile_body:
      'The mobile BulenNode app offers a light‑node mode and a wallet‑only mode. Users can configure when the node may operate (for example, at night or only on Wi‑Fi), how much data it can use, and whether it can join validator committees directly or delegate stake to trusted validators.',
    apps_desktop_title: '4.3 Desktop app',
    apps_desktop_body:
      'On desktop, BulenNode can run as a full or pruned node, with a graphical panel for data‑directory selection, disk limits and network ports. It can also run headless as a system service.',
    apps_panel_title: '4.4 User panel',
    apps_panel_body:
      'A built‑in dashboard shows block height, connected peers, estimated data usage, active stake, reputation score and recent rewards, helping users decide whether running a node is worthwhile for them.',
    requirements_title: '5. Technical requirements',
    requirements_mobile_title: '5.1 Mobile nodes',
    requirements_mobile_body:
      'Target devices are mainstream smartphones from the last ~5 years, with at least 3 GB of RAM and a few hundred MB of free storage. CPU usage should remain low and background activity must respect the platform’s power‑saving rules.',
    requirements_desktop_title: '5.2 Desktop and server nodes',
    requirements_desktop_body:
      'Full nodes need at least 4 GB of RAM, several GB of disk space and a stable internet connection. The protocol supports pruning and checkpoints so that disk usage grows in a controlled way. Server deployments can use dedicated disks for chain data.',
    requirements_network_title: '5.3 Network requirements',
    requirements_network_body:
      'Nodes that want uptime rewards must be reliably online. Desktop and server nodes should have reachable ports and may use NAT‑traversal techniques like hole punching when behind consumer routers. Mobile users can restrict mobile data usage and run mostly on Wi‑Fi.',
    economics_title: '6. Economics of running a node',
    economics_income:
      'Node income combines block rewards, transaction‑fee share and uptime rewards. In early mainnet, higher base rewards can attract pioneers; later on, fees from real usage should become the dominant component.',
    economics_costs:
      'User‑side costs include electricity, data transfer, hardware wear and stake risk. Applications should show estimated energy/data usage and clearly warn about the possibility of losing part of the stake in case of misconfiguration or malicious behaviour.',
    economics_policy:
      'Emission/fees: 8%→6%→4%→2.5%→1.5% annual taper, rewards split 60% validators/committee, 20% uptime/loyalty, 20% ecosystem pool; fees: 30% burned, 60% validators, 10% ecosystem; parameters are published and only adjustable within narrow governance bands.',
    economics_payouts:
      'Payout cadence: testnet settles daily to exercise tooling; mainnet pays per epoch (~weekly) after finality, with public calendars/dashboards showing burns, pool balances and epoch IDs.',
    economics_loyalty_title: '6.1 Age & loyalty multipliers',
    economics_loyalty_body:
      'Older nodes with continuous uptime and committed stake earn more: +2% per online month (capped 1.5x) minus downtime penalty, plus up to +50% loyalty boost for long-lived stake. Bonuses decay after downtime and reset on withdrawals or slashing.',
    economics_loyalty_point1: 'Age score: signed uptime receipts; 2-day grace, decay after.',
    economics_loyalty_point2: 'Loyalty pool: commit 10–50% stake; full maturity at 18 months.',
    economics_loyalty_point3: 'Safety valves: caps (1.5x age, 1.5x total), reset on fraud.',
    roadmap_title: '7. Launch phases and deployment',
    roadmap_testnet_title: '7.1 Testnet',
    roadmap_testnet_body:
      'BulenCoin starts with a public testnet where reference nodes are operated by the team. Users can install BulenNode, test running nodes on different hardware and help tune consensus parameters without real economic value at risk.',
    roadmap_mainnet_title: '7.2 Mainnet bootstrap',
    roadmap_mainnet_body1:
      'After testnet stabilises, the mainnet is launched with a mix of team‑operated and community full nodes. Early uptime‑reward programs encourage users to keep mobile and desktop nodes online.',
    roadmap_mainnet_body2:
      'Setup instructions include installing BulenNode from official sources, generating a wallet and seed backup, configuring resource limits, choosing between full or partial node modes, and optionally delegating stake to validators for users who do not want to operate validator nodes themselves.',
    roadmap_decentral_title: '7.3 Full decentralisation',
    roadmap_decentral_body:
      'Over time, parameters limiting the share of blocks produced by team‑controlled nodes are reduced. Community nodes with stake and a history of honest behaviour take over, while team infrastructure focuses on explorers, archival nodes and tooling.',
    security_title: '8. Security and supporting infrastructure',
    security_keys_title: '8.1 Key management',
    security_keys_body:
      'BulenNode encrypts private keys with strong passwords and uses secure platform modules where available (for example Android Keystore or iOS Secure Enclave). Desktop apps can integrate with hardware wallets. The UI must clearly explain that losing the seed phrase means losing access to funds, and that sharing it with anyone is unsafe.',
    security_attacks_title: '8.2 Sybil, DDoS and abuse protection',
    security_attacks_body:
      'Because BulenCoin expects many cheap nodes, the protocol defends against Sybil attacks by tying consensus participation to stake and reputation. Networking layers use peer randomisation, connection limits and basic rate‑limiting. Gateways may require lightweight proof‑of‑work puzzles when establishing sessions to make large‑scale abuse more expensive.',
    security_updates_title: '8.3 Protocol upgrades',
    security_updates_body:
      'Nodes support rolling software updates without global shutdowns. Critical hard‑fork changes are announced in advance, and clients contain warning systems that inform users about approaching upgrade deadlines.',
    infra_title: '8.4 Explorers, status page and telemetry',
    infra_body:
      'The BulenCoin ecosystem includes a block explorer, a public network‑status page and anonymised telemetry. Telemetry is designed from day one with data minimisation principles so that individual users cannot be identified.',
    faq_title: '9. FAQ – BulenCoin in practice',
    docs_title: 'Documentation & downloads',
    docs_subtitle:
      'Everything in one place: spec, deployment guides, security notes, investor deck and the new full‑stack integration test runbook.',
    docs_whitesheet_title: 'Investor whitesheet (PL)',
    docs_whitesheet_body:
      'Investor‑facing summary of the mission, product, economics, security posture and launch roadmap.',
    docs_spec_title: 'Protocol specification (PL)',
    docs_spec_body: 'Network architecture, node types, consensus, incentives and hardware targets.',
    docs_overview_title: 'Overview (EN)',
    docs_overview_body: 'English high‑level overview of the protocol, incentives and launch phases.',
    docs_deploy_title: 'Deployment guides',
    docs_deploy_body: 'How to run nodes, explorer, status service and Docker wiring.',
    docs_security_title: 'Security & compliance',
    docs_security_body: 'Hardening guidance plus conceptual AML/RODO/legal considerations.',
    docs_testing_title: 'Full‑stack integration',
    docs_testing_body:
      'New integration level that runs BulenNode, the explorer and the status service together and produces a block.',
    downloads_title: 'Downloads',
    downloads_subtitle:
      'One-command installers for laptops, servers, Raspberry Pi, macOS and Windows. Mobile builds (APK/TestFlight) are in flight; signed packages (.exe/.pkg/.deb/.rpm) will follow.',
    download_linux_cli_pill: 'Linux CLI',
    download_linux_cli_title: 'Laptop/server one-liner',
    download_linux_cli_body: 'Debian/Ubuntu, installs Node 18+ if missing, sets up bulennode.',
    download_pi_cli_pill: 'Raspberry Pi / ARM',
    download_pi_cli_title: 'Pi-friendly install',
    download_pi_cli_body:
      'Pi 4/ARM SBC profile with energy-aware defaults and faucet off by default for public hosts.',
    download_macos_cli_pill: 'macOS CLI',
    download_macos_cli_title: 'Homebrew or nvm',
    download_macos_cli_body: 'Installs Node via Homebrew or per-user nvm, then bulennode deps.',
    download_windows_cli_pill: 'Windows CLI',
    download_windows_cli_title: 'Winget/Chocolatey',
    download_windows_cli_body:
      'Installs Node 18 LTS via winget or choco, then bulennode deps for chosen profile.',
    download_docker: 'Docker Compose',
    download_docker_body: 'Run node + dependencies locally with one command.',
    download_signed_note:
      'Signed packages (.exe/.pkg/.deb/.rpm) ship later; use the one-command installers above now.',
    faq_q1: 'Is BulenCoin just hype?',
    faq_a1:
      'No. The brand is playful, but the protocol is designed as a serious experiment in running a full crypto network on mainstream devices, combining research ideas from lightweight consensus, energy awareness and user‑friendly node operation.',
    faq_q2: 'How do I start running a node?',
    faq_a2:
      'In testnet and mainnet, you download BulenNode from official sources, create a wallet and seed backup, choose your node mode (mobile light, desktop full, gateway, or wallet‑only), configure resource limits, and optionally stake or delegate your BulenCoin. See the deployment guide in this repository for a full step‑by‑step description.',
    faq_q3: 'What are the main risks?',
    faq_a3:
      'As with any cryptocurrency, there is no guaranteed profit. You can lose access to your funds by losing your seed phrase, and a misconfigured or malicious node may be slashed. Hardware, electricity and data usage also have a cost. BulenCoin is an experimental project and should be treated as such.',
    calc_title: 'Reward projection',
    calc_subtitle:
      'Estimate hourly/daily/weekly rewards based on your stake, device type and uptime. Values pulled from a running BulenNode.',
    calc_stake_label: 'Stake amount (BULEN)',
    calc_device_label: 'Device class',
    calc_uptime_label: 'Hours online per day',
    calc_days_label: 'Projection window (days)',
    calc_age_label: 'Node age (days online)',
    calc_offline_label: 'Offline days in last 30',
    calc_loyalty_pct_label: 'Stake committed to loyalty (%)',
    calc_loyalty_months_label: 'Months since last withdrawal',
    calc_button: 'Calculate',
    calc_result_title: 'Weekly projection',
    calc_result_subtitle: 'Indicative only; real rewards depend on network usage and parameters.',
    calc_metric_hourly: 'Hourly',
    calc_metric_daily: 'Daily',
    calc_metric_weekly: 'Weekly',
    calc_metric_period: 'Period total',
    leaderboard_title: 'Leaderboard & badges',
    leaderboard_subtitle:
      'Live rewards hub scores (uptime/stake) so everyone can see the network is active.',
    leaderboard_refresh: 'Refresh',
    leaderboard_error: 'Unable to load leaderboard (is rewards hub reachable / CORS allowed?).',
    leaderboard_table_node: 'Node',
    leaderboard_table_score: 'Score',
    leaderboard_table_stake: 'Stake',
    leaderboard_table_uptime: 'Uptime',
    leaderboard_table_badges: 'Badges',
    leaderboard_badges_title: 'Badge legend',
    leaderboard_badges_body: 'Telemetry-only prototype; badges help newcomers spot active nodes.',
    leaderboard_badge_uptime: '99% uptime window',
    leaderboard_badge_mobile: 'Mobile / gateway hero',
    leaderboard_badge_staker: 'Stake ≥ 1000 BULEN',
    leaderboard_source_prefix: 'Rewards hub:',
    community_title: 'Community layer: proof, support and visibility',
    community_subtitle:
      'Pods, rituals and public signals so newcomers see who keeps nodes online and where to ask for help.',
    community_highlights_title: 'Live contributions & uptime proof',
    community_highlights_body:
      'Rolling feed of merged fixes, docs, meetups and nodes pledged for uptime; metrics below refresh from the community dataset.',
    community_metric_contributors: 'Active contributors',
    community_metric_hours: 'Mentor hours this week',
    community_metric_nodes: 'Nodes reporting to pods',
    community_note: 'Public feed is opt-in; items expire after 14 days to avoid stale bragging.',
    community_support_title: 'Support pods & rituals',
    community_support_point1: 'Daily health pings + signed uptime receipts.',
    community_support_point2: 'Weekly office hours (infra + wallet UX) and paired debugging.',
    community_support_point3: 'Moderated chat: copy/paste ready snippets, not hype.',
    community_support_point4: 'Local crews run meetups; notes land in docs within 24h.',
    community_support_body:
      'Want to help? Join a pod, pick an issue from the board and ship with a mentor who can sign off on uptime and reward traces.',
    community_cta_join: 'Open the operator runbook',
    community_tag_docs: 'docs',
    community_tag_infra: 'infra',
    community_tag_wallets: 'wallets',
    community_tag_education: 'education',
    community_feed_empty: 'No public signals yet — opt in to show your pod and uptime receipts.',
    partner_title: 'Partner & referral program (sane terms)',
    partner_subtitle:
      'Tiered revenue share with caps, hands-on integration help and transparent reporting so partners know what they earn.',
    partner_tier_product: 'Product & app partners',
    partner_tier_product_title: 'Ship BulenCoin in your product',
    partner_tier_product_body:
      'Wallets, POS apps and dev tools get co-owned docs, SDK pairing and shared SLOs. 8% success fee for 90 days, then 3% with quality gates.',
    partner_tier_product_point1: 'Joint backlog & QA sign-off for each release.',
    partner_tier_product_point2: 'Sandbox keys + mock data for demos.',
    partner_tier_product_point3: 'Co-marketing that ships only after uptime proves out.',
    partner_tier_infra: 'Infrastructure & hosting',
    partner_tier_infra_title: 'Keep nodes and gateways up',
    partner_tier_infra_body:
      'Operators who maintain public gateways or explorers get boosted referral rates (up to 12%) tied to signed uptime receipts and latency SLOs.',
    partner_tier_infra_point1: 'Telemetry tokens + probes to verify uptime.',
    partner_tier_infra_point2: 'Back-pressure & rate-limit templates baked in.',
    partner_tier_infra_point3: 'Incident channel with humans, not bots.',
    partner_tier_creator: 'Creators & local crews',
    partner_tier_creator_title: 'Teach, translate, host meetups',
    partner_tier_creator_body:
      'Local leaders earn fixed grants + tracked referrals when workshops convert to real nodes. We publish proof-of-impact dashboards monthly.',
    partner_tier_creator_point1: 'Starter kits: slides, demos, QR-ready handouts.',
    partner_tier_creator_point2: 'Translation budget with review from core team.',
    partner_tier_creator_point3: 'Referral IDs mapped to wallets for transparent payouts.',
    referral_calc_title: 'Referral calculator',
    referral_calc_subtitle:
      'Estimate monthly payouts with sane caps. Partners get a base share plus a reliability bonus from node uptime.',
    referral_role_label: 'Partner type',
    referral_role_product: 'Product / app',
    referral_role_infra: 'Infrastructure',
    referral_role_creator: 'Creator / community',
    referral_referrals_label: 'Qualified leads per month',
    referral_conversion_label: 'Conversion rate (%)',
    referral_value_label: 'Avg monthly volume per conversion (BULEN)',
    referral_uptime_label: 'Your uptime (0-100%)',
    referral_calc_button: 'Calculate',
    referral_metric_monthly: 'Projected monthly payout',
    referral_metric_bonus: 'Reliability bonus',
    referral_metric_pool: 'Ecosystem pool impact',
    referral_code_title: 'Get your referral code',
    referral_code_subtitle:
      'Generate a deterministic code you can share now; map it to a wallet later without re-issuing links.',
    referral_code_handle: 'Your brand / node ID',
    referral_code_contact: 'Contact (for approvals)',
    referral_code_button: 'Generate code',
    referral_code_result_label: 'Code',
    referral_code_note:
      'Codes use HMAC + timestamp so they are unique but verifiable; share the code in proposals or during onboarding.',
    referral_error_inputs: 'Enter positive numbers for leads, conversion and volume.',
    referral_code_error: 'Add your brand/node ID before generating a code.',
    onboarding_title: 'Start in 5 minutes (testnet)',
    onboarding_body:
      'Grab test tokens, install a one-click package, create a wallet with a seed backup and join the network with safe defaults. Works on desktop, gateway or mobile light mode.',
    onboarding_step1_title: '1) Get test BULEN',
    onboarding_step1_body:
      'Call the faucet: curl -X POST http://localhost:4100/api/faucet -d \'{"address":"alice"}\' or use the web form in your BulenNode UI.',
    onboarding_step2_title: '2) Install & run',
    onboarding_step2_body:
      'Use the desktop/gateway installers (see Downloads) or run npm start in bulennode/. Mobile light mode uses the same profile but prunes state.',
    onboarding_step3_title: '3) Wallet & backup',
    onboarding_step3_body:
      'Generate a wallet, write down the seed, and store an encrypted backup. Nodes store a local checkpoint so you can resume after reboot without full resync.',
    onboarding_step4_title: '4) Watch earnings',
    onboarding_step4_body:
      'Open /api/status or the explorer to see height, stake, uptime boosts and projected weekly rewards.',
    onboarding_cta_title: 'One-click packages',
    onboarding_desktop: 'Desktop / laptop validator (desktop-full)',
    onboarding_gateway: 'Gateway/API profile (gateway)',
    onboarding_mobile: 'Mobile light profile (battery-aware)',
    onboarding_note:
      'Coming soon: video walkthrough and prebuilt binaries per OS. For now, use the guides above or Docker Compose in this repo.',
    wallet_creator_title: 'Create a wallet on any node profile',
    wallet_creator_subtitle:
      'Desktop, gateway and mobile share one clear flow: generate the seed locally, back it up and get an address instantly.',
    wallet_creator_desktop_title: 'Desktop / server validator',
    wallet_creator_desktop_body:
      'Generate a wallet for full nodes focused on uptime and staking. Keys stay on this device.',
    wallet_creator_gateway_title: 'Gateway / API node',
    wallet_creator_gateway_body:
      'Create a wallet to accept payments via API or explorer; keep auth tokens and TLS enabled.',
    wallet_creator_mobile_title: 'Mobile light / companion',
    wallet_creator_mobile_body:
      'Battery-aware light node with offline seed generation and quick sync when on Wi‑Fi.',
    wallet_creator_seed_label: 'Seed words (12)',
    wallet_creator_seed_hint: 'Generated locally; click “Generate wallet” to create a fresh seed.',
    wallet_creator_seed_generated: 'Key generated locally. Backup below.',
    wallet_creator_address_label: 'Address',
    wallet_creator_address_hint: 'Generate to see address.',
    wallet_creator_generate: 'Generate wallet',
    wallet_creator_copy_seed: 'Copy seed',
    wallet_creator_backup_label: 'Backup',
    wallet_creator_backup_check: 'I wrote down the seed / backup',
    wallet_creator_backup:
      'Local-only generation; write down the seed and store it offline before staking.',
    wallet_creator_passphrase_label: 'Encryption passphrase',
    wallet_creator_passphrase_hint: 'Used to encrypt the local keystore; minimum 12 characters.',
    wallet_creator_passphrase_error: 'Enter a passphrase (min 12 characters) to generate the wallet securely.',
    wallet_import_title: 'Import an existing wallet',
    wallet_import_body:
      'Paste the encrypted backup from another device and unlock it with your passphrase to reuse the same address everywhere.',
    wallet_import_paste_label: 'Paste backup (PEM)',
    wallet_import_button: 'Import wallet',
    wallet_import_success: 'Wallet imported. Address: {address}',
    wallet_import_error: 'Could not import backup. Check passphrase and PEM.',
    deploy_title: 'Deploy in 5 minutes',
    deploy_subtitle:
      'Choose your platform: desktop/gateway installer or mobile companion. Testnet builds include safe defaults, faucet and telemetry off by default.',
    deploy_desktop_title: 'Desktop / server',
    deploy_desktop_body:
      'Download the installer or use Docker Compose. Run with desktop-full or gateway profile, then visit /api/status.',
    deploy_guide: 'Open install guide',
    deploy_compose: 'Docker Compose',
    deploy_mobile_title: 'Run on mobile',
    deploy_mobile_body:
      'Light node with aggressive pruning and battery-aware mode. Grab the APK/TestFlight build (coming soon) or pair with a gateway for read-only monitoring.',
    deploy_mobile_learn: 'See mobile profile',
    deploy_mobile_soon: 'APK/TestFlight – coming soon',
    footer_note:
      'BulenCoin is an experimental project. This website describes a proposed network design and does not constitute financial, legal or tax advice. Operating nodes or services based on this design may be regulated in your jurisdiction; you are responsible for complying with local law.',
  },
  es: {
    nav_rewards: 'Recompensas',
    nav_overview: 'Visión general',
    nav_how: 'Cómo funciona',
    nav_nodes: 'Nodos',
    nav_consensus: 'Consenso',
    nav_economics: 'Economía',
    nav_apps: 'Aplicaciones',
    nav_community: 'Comunidad',
    nav_partners: 'Socios',
    nav_security: 'Seguridad',
    nav_docs: 'Documentación',
    nav_roadmap: 'Hoja de ruta',
    choose_language: 'Idioma',
    hero_title: 'Ejecuta un nodo real con el hardware que ya tienes.',
    hero_subtitle:
      'BulenCoin demuestra que Proof of Stake puede vivir en teléfonos, portátiles y servidores; ganas por mantener un nodo en línea, no por comprar rigs de minería.',
    hero_cta_run_desktop: 'Ejecutar en portátil/escritorio',
    hero_cta_run_pi: 'Ejecutar en Raspberry Pi',
    hero_cta_docs: 'Documentación y descargas',
    hero_cta_whitesheet: 'Whitesheet (PL, PDF)',
    chip_mobile: 'Tu móvil · portátil · servidor',
    chip_uptime: 'Gana por estar en línea',
    chip_nogpu: 'Sin GPUs ni rigs de minería',
    chip_multilingual: 'Docs: PL / EN / ES',
    hero_highlight_api: 'API de pagos on-chain con memo',
    hero_highlight_wallets: 'Challenge/verify de wallets: MetaMask, WalletConnect, Ledger',
    hero_highlight_tests: 'Tests full-stack incluidos (nodo + explorer + status)',
    live_title: 'Endpoints activos',
    live_subtitle: 'Nodo detectado. Abre la API, el explorer o la página de estado.',
    live_api: 'API',
    live_explorer: 'Explorer',
    live_status: 'Status',
    hero_card1_title: 'Pensado para dispositivos cotidianos',
    hero_card1_body:
      'Teléfonos, portátiles y servidores aseguran una sola red. Instala en minutos y deja que funcione en segundo plano.',
    hero_card2_title: 'Recompensas por uptime, no por hardware',
    hero_card2_body:
      'Los pagos ponderan stake y perfil de dispositivo; los bonus de antigüedad/lealtad premian a los nodos que siguen online. Cero carrera de GPUs.',
    hero_card3_title: 'Setup de un solo comando',
    hero_card3_body:
      'Instaladores para escritorio/servidor, Raspberry Pi y modos light/superlight en móvil, con tokens/TLS listos para hosts públicos.',
    how_title: 'Cómo funciona BulenCoin en cualquier dispositivo',
    how_subtitle: 'Explicación sencilla y vista técnica para operadores.',
    how_simple_title: 'Para todos',
    how_simple_point1:
      'Instala BulenNode en teléfono, portátil o servidor y elige un perfil (mobile light, desktop/server full o gateway API).',
    how_simple_point2:
      'Déjalo en línea; gana recompensas automáticas por uptime honesto y ayuda a asegurar la red. Sin granjas de minería.',
    how_simple_point3:
      'Envía/recibe pagos y haz stake; los gateways exponen APIs HTTP simples para wallets, tiendas y exploradores.',
    how_simple_point4:
      'Básicos de seguridad: copia de tu seed, token P2P en nodos públicos, rate limiting y TLS opcional.',
    how_expert_title: 'Para builders y operadores',
    how_expert_point1:
      'Proof of Stake ligero con comités pequeños; la selección usa stake, clase de dispositivo (móvil/tablet/portátil/servidor) y reputación.',
    how_expert_point2:
      'Perfiles: mobile light guarda cabeceras + estado reciente; desktop/server full guarda todo; el rol gateway expone RPC/REST; el perfil superlight de teléfono poda agresivamente.',
    how_expert_point3:
      'Recompensas autónomas: la block reward y las comisiones se reparten en cada bloque (burn, fondo de ecosistema, parte del productor, resto proporcional al stake).',
    how_expert_point4:
      'Controles de seguridad: firmas obligatorias, tokens P2P + handshake, TLS/QUIC opcional, rate limit, faucet desactivado en modo estricto; métricas y status protegidos por tokens.',
    run_title: 'Ejecuta un nodo en dispositivos cotidianos',
    run_subtitle:
      'Sin rigs GPU. Node 18+, SSD pequeño y un comando por plataforma. Diseñado para portátiles, Raspberry Pi/ARM e incluso modos light/superlight en móviles.',
    run_card_desktop_pill: 'Portátil / escritorio',
    run_card_desktop_title: 'Nodo completo en PCs comunes',
    run_card_desktop_body:
      '2 vCPU, 4 GB RAM, 20–40 GB SSD/NVMe. Peso de recompensa 0.8–1.0. No necesitas GPU ni hardware de datacenter.',
    run_card_desktop_note:
      'Instala Node.js automáticamente en Debian/Ubuntu; scripts equivalentes para macOS/Windows abajo.',
    run_card_pi_pill: 'Raspberry Pi / ARM',
    run_card_pi_title: 'Mantén tu Pi encendida y gana',
    run_card_pi_body:
      'Pi 4 (4 GB) + microSD/SSD. Peso 0.75 con boost ARM. Funciona 24/7 detrás del router con token P2P y TLS vía reverse proxy.',
    run_card_pi_note: 'Usa el mismo cliente ligero en Node.js; faucet desactivado en hosts públicos.',
    run_card_mobile_pill: 'Móvil / superlight',
    run_card_mobile_title: 'Light & superlight para teléfonos',
    run_card_mobile_body:
      'Guarda cabeceras + estado reciente; poda agresiva para cuidar batería y datos. Corre en Android/iOS en modo light; el build de escritorio lo puede simular.',
    run_card_mobile_note:
      'Telemetría y pesos de selección favorecen dispositivos diversos; la disponibilidad sigue recompensada.',
    run_chip_one_command: 'Instaladores de un comando por OS',
    run_chip_energy: 'Perfiles ahorradores, sin minería',
    run_chip_reward: 'Recompensas escalan por perfil, no por precio de hardware',
    run_passive_note:
      'Mantén nodos en línea ahora para ayudar a la red: cuando el producto madure, la disponibilidad honesta puede convertirse en recompensas significativas para los primeros operadores. No hay ganancias garantizadas.',
    overview_title: '1. ¿Qué es BulenCoin?',
    overview_intro:
      'BulenCoin es un experimento de Proof of Stake ligero enfocado en la accesibilidad: demostrar que una red moderna puede mantenerse con el espectro más amplio posible de dispositivos, desde teléfonos y tabletas hasta portátiles, ordenadores de escritorio y servidores.',
    overview_goal:
      'El protocolo está diseñado para ser lo bastante ligero como para ejecutarse en segundo plano en un dispositivo típico, y al mismo tiempo ofrecer recompensas predecibles para que los usuarios tengan un incentivo real para mantener su nodo en línea.',
    overview_layers:
      'La red se compone de varias capas lógicas: una capa peer‑to‑peer para bloques y transacciones, una capa de consenso basada en Proof of Stake con comités de validadores seleccionados aleatoriamente, una capa de datos con bloques, transacciones y estado de cuentas, y una capa de incentivos que define cómo se recompensa el comportamiento honesto y la disponibilidad.',
    nodes_title: '2. Tipos de nodos en la red BulenCoin',
    node_mobile_title: '2.1 Nodo ligero móvil',
    node_mobile_body1:
      'Un nodo ligero móvil es una aplicación que se ejecuta en un teléfono o tableta. En lugar de almacenar toda la cadena, guarda cabeceras de bloque y una pequeña parte del estado reciente necesaria para verificar sus propias transacciones y participar en el consenso.',
    node_mobile_body2:
      'Se conecta a varios nodos completos, descarga cabeceras y pruebas criptográficas, ayuda a monitorizar la disponibilidad de bloques y puede unirse a pequeños comités de validación si el usuario tiene BulenCoin en stake. La aplicación incluye controles estrictos de batería y datos, como modo nocturno y límites de datos móviles.',
    node_full_title: '2.2 Nodo completo de escritorio y servidor',
    node_full_body1:
      'Un nodo completo se ejecuta en ordenadores de escritorio, portátiles o servidores y almacena el historial completo de bloques y el estado de cuentas. Valida todas las transacciones y bloques y proporciona datos a los nodos ligeros.',
    node_full_body2:
      'Los nodos completos mantienen tablas de peers, propagan nuevos datos, pueden convertirse en productores de bloques cuando están en stake y pueden exponer APIs HTTP/WebSocket para actuar como puertas de enlace para aplicaciones web y móviles.',
    node_gateway_title: '2.3 Nodo puerta de enlace',
    node_gateway_body:
      'Un nodo puerta de enlace es un nodo completo con APIs públicas. Lo utilizan exchanges, procesadores de pago y usuarios que solo quieren un monedero. Las puertas de enlace exponen endpoints para enviar transacciones, leer saldos y consultar historial, con limitación de tasa y protección básica contra abusos.',
    node_wallet_title: '2.4 Nodo ultraligero de solo monedero',
    node_wallet_body:
      'En dispositivos muy limitados, los usuarios pueden ejecutar solo un monedero que no participa en el consenso ni en las recompensas por disponibilidad. Se comunica con puertas de enlace o funciona como cliente ligero de solo lectura, centrándose en la gestión de claves y la experiencia de usuario.',
    consensus_title: '3. Consenso e incentivos',
    consensus_intro:
      'BulenCoin utiliza un mecanismo ligero de Proof of Stake con comités de validadores seleccionados aleatoriamente. Los dispositivos bloquean BulenCoin como stake para participar en la producción de bloques y la votación.',
    consensus_selection:
      'En cada intervalo de tiempo, el protocolo selecciona de forma determinista a un productor de bloques y a un pequeño comité de validadores en función de bloques anteriores, la distribución de stake y la reputación de los nodos. El comité debe firmar el bloque conjuntamente para que se considere final.',
    consensus_device_type:
      'Para fomentar la diversidad, el algoritmo puede tener en cuenta el tipo de dispositivo. Las categorías poco representadas (por ejemplo, teléfonos móviles) reciben un pequeño impulso de selección, siempre que el nodo tenga suficiente stake y un buen historial de disponibilidad. Las puntuaciones de reputación reducen la probabilidad de que se seleccionen nodos maliciosos.',
    rewards_title: '3.1 Modelo de recompensas',
    rewards_blocks:
      'El modelo de recompensas combina recompensas de bloque, comisiones de transacción y recompensas explícitas por disponibilidad. Los productores de bloques y los miembros del comité reciben una parte de la recompensa de bloque y de las comisiones.',
    rewards_uptime:
      'Las recompensas por disponibilidad se calculan en ventanas de tiempo. La red toma muestras aleatorias de nodos y envía comprobaciones simples de estado; los nodos que responden de forma constante reciben una recompensa adicional proporcional al stake y ajustada por coeficientes según el tipo de dispositivo, de modo que incluso hardware modesto pero estable pueda ganar cantidades significativas.',
    rewards_slashing:
      'Un mecanismo de slashing penaliza las firmas dobles y otros ataques al consenso quemando parte del stake del infractor y reduciendo su reputación.',
    apps_title: '4. Aplicaciones BulenNode',
    apps_modules_title: '4.1 Arquitectura multiplataforma del nodo',
    apps_modules_body1:
      'El cliente BulenNode se divide en módulos: red (descubrimiento de peers y gossip), consenso (lógica de Proof of Stake), almacenamiento (base de datos de bloques y estado), monedero (claves y transacciones) y monitorización de recursos (CPU, RAM, ancho de banda y batería).',
    apps_modules_body2:
      'El código específico de plataforma se mantiene detrás de interfaces estables, de modo que la misma lógica central pueda ejecutarse en Android, iOS, Windows, macOS y Linux.',
    apps_mobile_title: '4.2 Aplicación móvil',
    apps_mobile_body:
      'La aplicación móvil BulenNode ofrece un modo de nodo ligero y un modo solo monedero. Los usuarios pueden configurar cuándo puede funcionar el nodo (por ejemplo, de noche o solo con Wi‑Fi), cuántos datos puede usar y si puede unirse directamente a comités de validación o delegar el stake en validadores de confianza.',
    apps_desktop_title: '4.3 Aplicación de escritorio',
    apps_desktop_body:
      'En escritorio, BulenNode puede ejecutarse como nodo completo o podado, con un panel gráfico para elegir el directorio de datos, límites de disco y puertos de red. También puede ejecutarse sin interfaz como servicio del sistema.',
    apps_panel_title: '4.4 Panel de usuario',
    apps_panel_body:
      'Un panel integrado muestra la altura de bloque, peers conectados, consumo estimado de datos, stake activo, puntuación de reputación y recompensas recientes, ayudando al usuario a decidir si mantener un nodo le compensa.',
    requirements_title: '5. Requisitos técnicos',
    requirements_mobile_title: '5.1 Nodos móviles',
    requirements_mobile_body:
      'Los dispositivos objetivo son smartphones habituales de los últimos ~5 años, con al menos 3 GB de RAM y unos cientos de MB de almacenamiento libre. El uso de CPU debe ser bajo y la actividad en segundo plano debe respetar las reglas de ahorro de energía de la plataforma.',
    requirements_desktop_title: '5.2 Nodos de escritorio y servidor',
    requirements_desktop_body:
      'Los nodos completos necesitan al menos 4 GB de RAM, varios GB de espacio en disco y una conexión a Internet estable. El protocolo admite poda e instantáneas para que el uso de disco crezca de forma controlada. En servidores se pueden usar discos dedicados para los datos de la cadena.',
    requirements_network_title: '5.3 Requisitos de red',
    requirements_network_body:
      'Los nodos que quieran recompensas por disponibilidad deben estar en línea de forma fiable. Los nodos de escritorio y servidor deberían tener puertos accesibles y pueden usar técnicas de NAT‑traversal como hole punching cuando están detrás de routers domésticos. Los usuarios móviles pueden limitar el uso de datos móviles y funcionar principalmente con Wi‑Fi.',
    economics_title: '6. Economía de ejecutar un nodo',
    economics_income:
      'Los ingresos de un nodo combinan recompensas de bloque, parte de las comisiones de transacción y recompensas por disponibilidad. En el inicio de mainnet se pueden usar recompensas base más altas para atraer pioneros; más adelante, las comisiones del uso real deberían ser el componente dominante.',
    economics_costs:
      'Los costes para el usuario incluyen electricidad, transferencia de datos, desgaste del hardware y riesgo sobre el stake. Las aplicaciones deben mostrar consumo estimado de energía/datos y advertir claramente sobre la posibilidad de perder parte del stake en caso de mala configuración o comportamiento malicioso.',
    economics_policy:
      'Emisión/tarifas: inflación 8%→6%→4%→2.5%→1.5% anual, reparto de recompensas 60% validadores/comité, 20% uptime/lealtad, 20% fondo de ecosistema; comisiones: 30% quemadas, 60% validadores, 10% ecosistema; parámetros públicos y ajustables solo en bandas acotadas por gobernanza.',
    economics_payouts:
      'Pagos: en testnet liquidación diaria para ejercitar herramientas; en mainnet pagos por época (~semanal) tras finalización, con calendarios/paneles públicos que muestran quemas, saldos del fondo e IDs de época.',
    economics_loyalty_title: '6.1 Multiplicadores de antigüedad y lealtad',
    economics_loyalty_body:
      'Nodos veteranos con uptime continuo y stake comprometido ganan más: +2% por mes online (tope 1.5x) menos penalización por caídas, más hasta +50% de boost de lealtad para stake de largo plazo. Las bonificaciones decaen tras downtime y se reinician al retirar o por slashing.',
    economics_loyalty_point1: 'Puntaje de edad: recibos de uptime firmados; 2 días de gracia, luego decay.',
    economics_loyalty_point2: 'Pool de lealtad: compromete 10–50% del stake; madurez completa a 18 meses.',
    economics_loyalty_point3: 'Válvulas de seguridad: topes (1.5x edad, 1.5x total), reset ante fraude.',
    roadmap_title: '7. Fases de lanzamiento y despliegue',
    roadmap_testnet_title: '7.1 Testnet',
    roadmap_testnet_body:
      'BulenCoin comienza con una testnet pública donde el equipo opera nodos de referencia. Los usuarios pueden instalar BulenNode, probar nodos en distinto hardware y ayudar a ajustar parámetros de consenso sin riesgo económico real.',
    roadmap_mainnet_title: '7.2 Arranque de mainnet',
    roadmap_mainnet_body1:
      'Tras estabilizar la testnet, se lanza la mainnet con una mezcla de nodos completos operados por el equipo y por la comunidad. Programas iniciales de recompensas por disponibilidad animan a los usuarios a mantener nodos móviles y de escritorio en línea.',
    roadmap_mainnet_body2:
      'Las instrucciones de configuración incluyen instalar BulenNode desde fuentes oficiales, generar un monedero y copia de seguridad de la seed, configurar límites de recursos, elegir entre modo de nodo completo o parcial y, opcionalmente, delegar el stake en validadores para usuarios que no quieran operar nodos validadores ellos mismos.',
    roadmap_decentral_title: '7.3 Descentralización completa',
    roadmap_decentral_body:
      'Con el tiempo, se reducen los parámetros que limitan la proporción de bloques producidos por nodos controlados por el equipo. Los nodos de la comunidad con stake e historial de buen comportamiento toman el control, mientras que la infraestructura del equipo se centra en exploradores, nodos de archivo y herramientas.',
    security_title: '8. Seguridad e infraestructura de apoyo',
    security_keys_title: '8.1 Gestión de claves',
    security_keys_body:
      'BulenNode cifra las claves privadas con contraseñas fuertes y utiliza módulos seguros de la plataforma cuando están disponibles (por ejemplo, Android Keystore o iOS Secure Enclave). Las aplicaciones de escritorio pueden integrarse con monederos hardware. La interfaz debe explicar claramente que perder la seed implica perder acceso a los fondos y que compartirla con cualquier persona es inseguro.',
    security_attacks_title: '8.2 Protección contra Sybil, DDoS y abusos',
    security_attacks_body:
      'Como BulenCoin espera muchos nodos baratos, el protocolo se defiende de ataques Sybil vinculando la participación en el consenso al stake y a la reputación. Las capas de red usan aleatorización de peers, límites de conexiones y limitación básica de tasa. Las puertas de enlace pueden exigir pequeños puzzles de proof of work al establecer sesiones para encarecer el abuso masivo.',
    security_updates_title: '8.3 Actualizaciones de protocolo',
    security_updates_body:
      'Los nodos admiten actualizaciones de software progresivas sin apagados globales. Los cambios críticos que requieren hard fork se anuncian con antelación, y los clientes incluyen sistemas de aviso que informan sobre plazos de actualización.',
    infra_title: '8.4 Exploradores, página de estado y telemetría',
    infra_body:
      'El ecosistema BulenCoin incluye un explorador de bloques, una página pública de estado de la red y telemetría anonimizada. La telemetría se diseña desde el principio con principios de minimización de datos, de modo que no se pueda identificar a usuarios individuales.',
    docs_title: 'Documentación y descargas',
    docs_subtitle:
      'Todo en un lugar: especificación, guías de despliegue, notas de seguridad, deck para inversores y el nuevo test de integración full-stack.',
    docs_whitesheet_title: 'Whitesheet para inversores (PL)',
    docs_whitesheet_body:
      'Resumen para inversores: objetivo, producto, economía, postura de seguridad y hoja de ruta de lanzamiento.',
    docs_spec_title: 'Especificación del protocolo (PL)',
    docs_spec_body:
      'Arquitectura de red, tipos de nodos, consenso, incentivos y requisitos de hardware.',
    docs_overview_title: 'Overview (EN)',
    docs_overview_body:
      'Resumen técnico en inglés sobre el protocolo, incentivos y fases de lanzamiento.',
    docs_deploy_title: 'Guías de despliegue',
    docs_deploy_body: 'Cómo ejecutar nodos, el explorador, el servicio de estado y la configuración Docker.',
    docs_security_title: 'Seguridad y cumplimiento',
    docs_security_body:
      'Recomendaciones de hardening y consideraciones conceptuales sobre legal/AML/RODO.',
    docs_testing_title: 'Integración full-stack',
    docs_testing_body:
      'Nuevo nivel de pruebas que ejecuta BulenNode, el explorador y el servicio de estado juntos y genera un bloque.',
    downloads_title: 'Descargas',
    downloads_subtitle:
      'Instaladores de un comando para portátiles, servidores, Raspberry Pi, macOS y Windows. Builds móviles (APK/TestFlight) en camino; los paquetes firmados (.exe/.pkg/.deb/.rpm) llegarán después.',
    download_linux_cli_pill: 'CLI Linux',
    download_linux_cli_title: 'Un comando en portátil/servidor',
    download_linux_cli_body:
      'Debian/Ubuntu, instala Node 18+ si falta y configura bulennode.',
    download_pi_cli_pill: 'Raspberry Pi / ARM',
    download_pi_cli_title: 'Instalación para Pi',
    download_pi_cli_body:
      'Perfil Pi 4/ARM con ajustes de bajo consumo y faucet desactivado por defecto en hosts públicos.',
    download_macos_cli_pill: 'CLI macOS',
    download_macos_cli_title: 'Homebrew o nvm',
    download_macos_cli_body:
      'Instala Node vía Homebrew o nvm de usuario y luego dependencias de bulennode.',
    download_windows_cli_pill: 'CLI Windows',
    download_windows_cli_title: 'Winget/Chocolatey',
    download_windows_cli_body:
      'Instala Node 18 LTS con winget o choco y luego dependencias de bulennode para el perfil elegido.',
    download_docker: 'Docker Compose',
    download_docker_body: 'Ejecuta nodo + dependencias con un solo comando.',
    download_signed_note:
      'Los paquetes firmados (.exe/.pkg/.deb/.rpm) llegarán después; usa ahora los instaladores de un comando.',
    earnings_title: 'Panel de ganancias',
    earnings_subtitle:
      'Vista en vivo de tu nodo y una proyección rápida. Usa /api/status (con token si aplica) y /api/rewards/estimate.',
    earnings_refresh: 'Actualizar',
    earnings_metrics_title: 'Métricas del nodo',
    earnings_height: 'Altura',
    earnings_peers: 'Peers',
    earnings_uptime: 'Disponibilidad (h)',
    earnings_reward_weight: 'Peso de recompensa',
    earnings_projection_title: 'Proyección',
    earnings_stake_label: 'Stake (BULEN)',
    earnings_weekly: 'Semanal (est.)',
    earnings_note: 'Es orientativo; depende del uso de la red y los parámetros.',
    earnings_error: 'No se pudo cargar status/rewards. Revisa el nodo y tokens.',
    faq_title: '9. Preguntas frecuentes – BulenCoin en la práctica',
    faq_q1: '¿BulenCoin es solo ruido?',
    faq_a1:
      'No. La marca es divertida, pero el protocolo está diseñado como un experimento serio para ejecutar una red cripto completa en dispositivos comunes, combinando ideas de consenso ligero, eficiencia energética y operación de nodos amigable para el usuario.',
    faq_q2: '¿Cómo empiezo a ejecutar un nodo?',
    faq_a2:
      'En testnet y mainnet, descargas BulenNode desde fuentes oficiales, creas un monedero y copia de seguridad de la seed, eliges el modo de nodo (ligero móvil, completo de escritorio, puerta de enlace o solo monedero), configuras los límites de recursos y, opcionalmente, pones BulenCoin en stake o lo delegas. Consulta la guía de despliegue de este repositorio para ver todos los pasos.',
    faq_q3: '¿Cuáles son los principales riesgos?',
    faq_a3:
      'Como en cualquier criptomoneda, no hay beneficios garantizados. Puedes perder acceso a tus fondos si pierdes la seed, y un nodo mal configurado o malicioso puede ser penalizado (slashing). El hardware, la electricidad y los datos también tienen coste. BulenCoin es un proyecto experimental y debe tratarse como tal.',
    calc_title: 'Proyección de recompensas',
    calc_subtitle:
      'Calcula recompensas hora/día/semana según tu stake, tipo de dispositivo y horas online. Valores desde un BulenNode en ejecución.',
    calc_stake_label: 'Cantidad en stake (BULEN)',
    calc_device_label: 'Clase de dispositivo',
    calc_uptime_label: 'Horas en línea por día',
    calc_days_label: 'Ventana de proyección (días)',
    calc_age_label: 'Antigüedad del nodo (días online)',
    calc_offline_label: 'Días offline en últimos 30',
    calc_loyalty_pct_label: 'Stake en pool de lealtad (%)',
    calc_loyalty_months_label: 'Meses desde último retiro',
    calc_button: 'Calcular',
    calc_result_title: 'Proyección semanal',
    calc_result_subtitle: 'Indicativo; las recompensas reales dependen del uso y parámetros.',
    calc_metric_hourly: 'Por hora',
    calc_metric_daily: 'Diaria',
    calc_metric_weekly: 'Semanal',
    calc_metric_period: 'Total del periodo',
    leaderboard_title: 'Clasificación y medallas',
    leaderboard_subtitle:
      'Puntuaciones en vivo del rewards hub (uptime/stake) para demostrar que la red está viva.',
    leaderboard_refresh: 'Actualizar',
    leaderboard_error: 'No se pudo poblar la clasificación (¿hub accesible/CORS habilitado?).',
    leaderboard_table_node: 'Nodo',
    leaderboard_table_score: 'Puntuación',
    leaderboard_table_stake: 'Stake',
    leaderboard_table_uptime: 'Disponibilidad',
    leaderboard_table_badges: 'Medallas',
    leaderboard_badges_title: 'Leyenda de medallas',
    leaderboard_badges_body: 'Prototipo con telemetría; las medallas destacan nodos activos.',
    leaderboard_badge_uptime: 'Ventana de 99% uptime',
    leaderboard_badge_mobile: 'Héroe móvil / gateway',
    leaderboard_badge_staker: 'Stake ≥ 1000 BULEN',
    leaderboard_source_prefix: 'Rewards hub:',
    community_title: 'Capa comunitaria: prueba, soporte y visibilidad',
    community_subtitle:
      'Pods, rituales y señales públicas para que los recién llegados vean quién mantiene nodos en línea y dónde pedir ayuda.',
    community_highlights_title: 'Contribuciones en vivo y prueba de disponibilidad',
    community_highlights_body:
      'Feed de fixes, docs, meetups y nodos comprometidos con uptime; las métricas se refrescan con el dataset comunitario.',
    community_metric_contributors: 'Contribuidores activos',
    community_metric_hours: 'Horas de mentoría esta semana',
    community_metric_nodes: 'Nodos reportando a pods',
    community_note:
      'El feed público es opt-in; los ítems caducan a los 14 días para evitar ruido obsoleto.',
    community_support_title: 'Pods de soporte y rituales',
    community_support_point1: 'Pings diarios de salud + recibos firmados de uptime.',
    community_support_point2:
      'Office hours semanales (infra + UX de wallet) y depuración en pareja.',
    community_support_point3: 'Chat moderado: snippets listos para pegar, no hype.',
    community_support_point4: 'Equipos locales hacen meetups; las notas llegan a docs en 24h.',
    community_support_body:
      '¿Quieres ayudar? Únete a un pod, elige un issue y entrega con un mentor que pueda firmar uptime y trazas de recompensa.',
    community_cta_join: 'Abrir runbook operatora',
    community_tag_docs: 'docs',
    community_tag_infra: 'infra',
    community_tag_wallets: 'wallets',
    community_tag_education: 'educación',
    community_feed_empty: 'Aún no hay señales públicas — activa el feed para mostrar tu pod.',
    partner_title: 'Programa de partners y referidos (términos sensatos)',
    partner_subtitle:
      'Revenue share escalonado con topes, ayuda de integración y reporting transparente para saber cuánto ganas.',
    partner_tier_product: 'Partners de producto y apps',
    partner_tier_product_title: 'Incluye BulenCoin en tu producto',
    partner_tier_product_body:
      'Wallets, POS y devtools reciben docs co-propiedad, pairing de SDK y SLOs compartidos. 8% de success fee 90 días, luego 3% con puertas de calidad.',
    partner_tier_product_point1: 'Backlog conjunto y QA firmado por release.',
    partner_tier_product_point2: 'Claves de sandbox + datos mock para demos.',
    partner_tier_product_point3: 'Co-marketing solo después de probar uptime.',
    partner_tier_infra: 'Infraestructura y hosting',
    partner_tier_infra_title: 'Mantén nodos y gateways en línea',
    partner_tier_infra_body:
      'Operadores de gateways/explorers públicos obtienen tasas de referido mayores (hasta 12%) ligadas a recibos de uptime firmados y SLOs de latencia.',
    partner_tier_infra_point1: 'Tokens de telemetría + sondas para verificar uptime.',
    partner_tier_infra_point2: 'Plantillas de back-pressure y rate limit incluidas.',
    partner_tier_infra_point3: 'Canal de incidentes con humanos, no bots.',
    partner_tier_creator: 'Creadores y comunidades locales',
    partner_tier_creator_title: 'Enseña, traduce, organiza meetups',
    partner_tier_creator_body:
      'Líderes locales ganan grants fijos + referidos trazables cuando talleres se convierten en nodos reales. Publicamos dashboards de impacto mensuales.',
    partner_tier_creator_point1: 'Kits de arranque: slides, demos, handouts con QR.',
    partner_tier_creator_point2: 'Presupuesto de traducción con revisión del core team.',
    partner_tier_creator_point3: 'IDs de referido mapeados a wallets para pagos transparentes.',
    referral_calc_title: 'Calculadora de referidos',
    referral_calc_subtitle:
      'Estima pagos mensuales con topes. Base + bonus de fiabilidad según uptime del nodo.',
    referral_role_label: 'Tipo de partner',
    referral_role_product: 'Producto / app',
    referral_role_infra: 'Infraestructura',
    referral_role_creator: 'Creador / comunidad',
    referral_referrals_label: 'Leads cualificados por mes',
    referral_conversion_label: 'Tasa de conversión (%)',
    referral_value_label: 'Volumen medio mensual por conversión (BULEN)',
    referral_uptime_label: 'Tu uptime (0-100%)',
    referral_calc_button: 'Calcular',
    referral_metric_monthly: 'Pago mensual proyectado',
    referral_metric_bonus: 'Bonus de fiabilidad',
    referral_metric_pool: 'Impacto en fondo de ecosistema',
    referral_code_title: 'Obtén tu código de referido',
    referral_code_subtitle:
      'Genera un código determinista compartible ahora; asígnalo a una wallet después sin reenviar enlaces.',
    referral_code_handle: 'Tu marca / ID de nodo',
    referral_code_contact: 'Contacto (para aprobación)',
    referral_code_button: 'Generar código',
    referral_code_result_label: 'Código',
    referral_code_note:
      'Los códigos usan HMAC + timestamp: únicos pero verificables; úsalos en propuestas u onboarding.',
    referral_error_inputs: 'Ingresa números válidos de leads, conversión y volumen.',
    referral_code_error: 'Añade tu marca o ID de nodo antes de generar el código.',
    onboarding_title: 'Empieza en 5 minutos (testnet)',
    onboarding_body:
      'Obtén tokens de prueba, instala un paquete de un clic, crea un wallet con copia de seed y únete con ajustes seguros. Funciona en escritorio, gateway o modo light móvil.',
    onboarding_step1_title: '1) Consigue BULEN de prueba',
    onboarding_step1_body:
      'Usa el faucet: curl -X POST http://localhost:4100/api/faucet -d \'{"address":"alice"}\' o el formulario web en tu BulenNode.',
    onboarding_step2_title: '2) Instala y ejecuta',
    onboarding_step2_body:
      'Instaladores escritorio/gateway (ver Descargas) o npm start en bulennode/. El modo light móvil recorta el estado.',
    onboarding_step3_title: '3) Wallet y backup',
    onboarding_step3_body:
      'Genera un wallet, apunta la seed y guarda un backup cifrado. El nodo guarda un checkpoint local para reanudar sin resincronizar todo.',
    onboarding_step4_title: '4) Observa las ganancias',
    onboarding_step4_body:
      'Abre /api/status o el explorador para ver altura, stake, boosts de disponibilidad y proyección semanal.',
    onboarding_cta_title: 'Paquetes de un clic',
    onboarding_desktop: 'Validador escritorio/portátil (desktop-full)',
    onboarding_gateway: 'Perfil Gateway/API (gateway)',
    onboarding_mobile: 'Perfil móvil light (ahorro batería)',
    onboarding_note:
      'Pronto: video tutorial y binarios precompilados. De momento usa las guías o Docker Compose de este repo.',
    wallet_creator_title: 'Crea un monedero en cualquier perfil de nodo',
    wallet_creator_subtitle:
      'Escritorio, gateway y móvil comparten un flujo claro: genera la semilla localmente, guárdala y obtén una dirección al instante.',
    wallet_creator_desktop_title: 'Validador escritorio / servidor',
    wallet_creator_desktop_body:
      'Genera un monedero para nodos completos centrados en uptime y stake. Las claves se quedan en este dispositivo.',
    wallet_creator_gateway_title: 'Nodo gateway / API',
    wallet_creator_gateway_body:
      'Crea un monedero para cobrar pagos vía API o explorador; mantén tokens de auth y TLS activados.',
    wallet_creator_mobile_title: 'Nodo ligero móvil / compañero',
    wallet_creator_mobile_body:
      'Nodo ligero y consciente de batería: semilla offline y sincronización rápida cuando haya red.',
    wallet_creator_seed_label: 'Palabras semilla (12)',
    wallet_creator_seed_hint:
      'Se genera localmente; haz clic en “Generar monedero” para crear una semilla nueva.',
    wallet_creator_seed_generated: 'Clave generada localmente. Backup abajo.',
    wallet_creator_address_label: 'Dirección',
    wallet_creator_address_hint: 'Genera para ver la dirección.',
    wallet_creator_generate: 'Generar monedero',
    wallet_creator_copy_seed: 'Copiar semilla',
    wallet_creator_backup_label: 'Backup',
    wallet_creator_backup_check: 'He apuntado la semilla / backup',
    wallet_creator_backup:
      'Generación solo local; apunta la semilla y guárdala offline antes de hacer stake.',
    wallet_creator_passphrase_label: 'Frase de cifrado',
    wallet_creator_passphrase_hint:
      'Se usa para cifrar el keystore local; mínimo 12 caracteres.',
    wallet_creator_passphrase_error:
      'Introduce una frase (min 12 caracteres) para generar el monedero de forma segura.',
    wallet_import_title: 'Importar un monedero existente',
    wallet_import_body:
      'Pega el backup cifrado desde otro dispositivo y desbloquéalo con tu frase para reutilizar la misma dirección en todas partes.',
    wallet_import_paste_label: 'Pega el backup (PEM)',
    wallet_import_button: 'Importar monedero',
    wallet_import_success: 'Monedero importado. Dirección: {address}',
    wallet_import_error: 'No se pudo importar el backup. Revisa la frase y el PEM.',
    deploy_title: 'Despliega en 5 minutos',
    deploy_subtitle:
      'Elige tu plataforma: instalador escritorio/gateway o app móvil. Los builds de testnet traen configuraciones seguras por defecto, faucet y telemetría desactivada.',
    deploy_desktop_title: 'Escritorio / servidor',
    deploy_desktop_body:
      'Descarga el instalador o usa Docker Compose. Ejecuta con el perfil desktop-full o gateway y visita /api/status.',
    deploy_guide: 'Abrir guía de instalación',
    deploy_compose: 'Docker Compose',
    deploy_mobile_title: 'Ejecutar en móvil',
    deploy_mobile_body:
      'Nodo ligero con poda agresiva y modo ahorro de batería. APK/TestFlight muy pronto; o empareja con un gateway para monitorizar en solo lectura.',
    deploy_mobile_learn: 'Ver perfil móvil',
    deploy_mobile_soon: 'APK/TestFlight – muy pronto',
    footer_note:
      'BulenCoin es un proyecto experimental. Este sitio describe un diseño de red propuesto y no constituye asesoramiento financiero, legal ni fiscal. La operación de nodos o servicios basados en este diseño puede estar regulada en tu jurisdicción; eres responsable de cumplir la legislación local.',
    wallet_title: 'Wallet y enlaces de pago',
    wallet_body:
      'Genera enlaces de pago estilo BIP21 y códigos QR para facturas. Ideal para wallets web/móvil y botones de pago rápidos.',
    wallet_address_label: 'Dirección de destino',
    wallet_amount_label: 'Importe (BULEN)',
    wallet_memo_label: 'Memo (opcional)',
    wallet_button: 'Generar enlace y QR',
    wallet_result_title: 'Tu enlace de pago',
    wallet_link_label: 'Enlace',
    wallet_qr_label: 'Código QR',
    wallet_copy: 'Copiar',
  },
  pl: {
    nav_rewards: 'Nagrody',
    nav_overview: 'Przegląd',
    nav_how: 'Jak to działa',
    nav_nodes: 'Węzły',
    nav_consensus: 'Konsensus',
    nav_economics: 'Ekonomia',
    nav_apps: 'Aplikacje',
    nav_community: 'Społeczność',
    nav_partners: 'Partnerzy',
    nav_security: 'Bezpieczeństwo',
    nav_docs: 'Dokumentacja',
    nav_roadmap: 'Roadmap',
    choose_language: 'Język',
    hero_title:
      'Uruchom prawdziwy węzeł na sprzęcie, który już masz.',
    hero_subtitle:
      'BulenCoin pokazuje, że Proof of Stake może działać na telefonach, laptopach i serwerach – zarabiasz za utrzymywanie węzła online, a nie za kupowanie koparek.',
    hero_cta_run_desktop: 'Uruchom na laptopie/PC',
    hero_cta_run_pi: 'Uruchom na Raspberry Pi',
    hero_cta_docs: 'Dokumentacja i pliki',
    hero_cta_whitesheet: 'Whitesheet (PL, PDF)',
    chip_mobile: 'Twój telefon · laptop · serwer',
    chip_uptime: 'Zarabiaj za bycie online',
    chip_nogpu: 'Bez GPU i koparek',
    chip_multilingual: 'Docs: PL / EN / ES',
    hero_highlight_api: 'On-chain payments API z memo do spięcia transakcji z zamówieniem',
    hero_highlight_wallets: 'Challenge/verify dla portfeli MetaMask, WalletConnect, Ledger',
    hero_highlight_tests: 'Full-stack testy w pakiecie (node + explorer + status)',
    live_title: 'Działające endpointy',
    live_subtitle: 'Wykryto węzeł. Otwórz API, eksplorator lub stronę statusu.',
    live_api: 'API',
    live_explorer: 'Eksplorator',
    live_status: 'Status',
    hero_card1_title: 'Stworzone pod zwykłe urządzenia',
    hero_card1_body:
      'Telefony, laptopy i serwery zabezpieczają jedną sieć. Instalacja w kilka minut, działa cicho w tle.',
    hero_card2_title: 'Nagrody za uptime, nie za sprzęt',
    hero_card2_body:
      'Wypłaty liczą stake i profil urządzenia; bonus wieku/lojalności premiuje węzły utrzymywane online. Zero wyścigu na GPU.',
    hero_card3_title: 'Instalacja jednym poleceniem',
    hero_card3_body:
      'Instalatory dla desktop/serwer, Raspberry Pi i trybów light/superlight na telefonach, z tokenami/TLS gotowymi na publiczne hosty.',
    how_title: 'Jak działa BulenCoin na każdym urządzeniu',
    how_subtitle: 'Warstwa prosta dla każdego i krótka techniczna dla operatorów.',
    how_simple_title: 'Dla każdego',
    how_simple_point1:
      'Zainstaluj BulenNode na telefonie, laptopie lub serwerze i wybierz profil (mobile light, desktop/server full lub gateway API).',
    how_simple_point2:
      'Po prostu trzymaj aplikację online – sama zbiera nagrody za uczciwy uptime i pomaga zabezpieczać sieć. Żadnych koparek.',
    how_simple_point3:
      'Wysyłaj/odbieraj płatności i stake’uj; węzły gateway udostępniają proste API HTTP dla portfeli, sklepów i eksploratorów.',
    how_simple_point4:
      'Podstawy bezpieczeństwa: kopia seeda, token P2P na publicznych węzłach, rate limiting i opcjonalnie TLS.',
    how_expert_title: 'Dla budujących i operatorów',
    how_expert_point1:
      'Lekki Proof of Stake z małymi komitetami; selekcja używa stake, klasy urządzenia (telefon/tablet/laptop/serwer) i reputacji.',
    how_expert_point2:
      'Profile: mobile light trzyma nagłówki + świeży stan; desktop/server full trzyma pełną historię; rola gateway wystawia RPC/REST; profil superlight na telefonie agresywnie tnie dane.',
    how_expert_point3:
      'Nagrody są autonomiczne: block reward + fee dzielone w każdym bloku (burn, pula ekosystemu, część producenta, reszta proporcjonalna do stake).',
    how_expert_point4:
      'Przełączniki bezpieczeństwa: wymagane podpisy, tokeny P2P + handshake, opcjonalnie TLS/QUIC, rate limiting, faucet off w trybie strict; metryki i status chronione tokenami.',
    run_title: 'Uruchom węzeł na zwykłym sprzęcie',
    run_subtitle:
      'Bez koparek GPU. Node 18+, mały SSD i jeden skrypt na platformę. Dla laptopów, Raspberry Pi/ARM oraz trybów light/superlight na telefonach.',
    run_card_desktop_pill: 'Laptop / desktop',
    run_card_desktop_title: 'Pełny węzeł na PC',
    run_card_desktop_body:
      '2 vCPU, 4 GB RAM, 20–40 GB SSD/NVMe. Waga nagród 0.8–1.0. Bez wymagań na GPU czy serwerownię.',
    run_card_desktop_note:
      'Automatycznie instaluje Node.js na Debian/Ubuntu; odpowiedniki dla macOS/Windows niżej.',
    run_card_pi_pill: 'Raspberry Pi / ARM',
    run_card_pi_title: 'Pi online = nagrody',
    run_card_pi_body:
      'Pi 4 (4 GB) + microSD/SSD. Waga 0.75 z boostem ARM. Może działać 24/7 za routerem z tokenem P2P i TLS przez reverse proxy.',
    run_card_pi_note: 'Ten sam lekki klient Node.js; faucet wyłączony na publicznych hostach.',
    run_card_mobile_pill: 'Mobile / superlight',
    run_card_mobile_title: 'Light & superlight na telefonach',
    run_card_mobile_body:
      'Trzyma nagłówki + świeży stan; agresywne przycinanie chroni baterię i transfer. Działa na Android/iOS w trybie light; desktop może to zasymulować.',
    run_card_mobile_note:
      'Telemetria i wagi selekcji promują różnorodne urządzenia; uptime wciąż nagradzany.',
    run_chip_one_command: 'Instalatory jednym poleceniem',
    run_chip_energy: 'Tryby oszczędne, zero kopania',
    run_chip_reward: 'Nagrody rosną wagą profilu, nie ceną sprzętu',
    run_passive_note:
      'Trzymaj węzły online już dziś, wspierając sieć — gdy produkt dojrzeje, uczciwy uptime może przełożyć się na realne nagrody dla pionierów. Brak gwarancji zysku.',
    overview_title: '1. Czym jest BulenCoin?',
    overview_intro:
      'BulenCoin to lekki eksperyment Proof of Stake skupiony na dostępności: pokazaniu, że nowoczesna sieć może być utrzymywana przez możliwie najszersze spektrum urządzeń – od telefonów i tabletów, przez laptopy i komputery stacjonarne, aż po serwery.',
    overview_goal:
      'Protokół jest zaprojektowany tak, by był na tyle lekki, aby działał w tle na typowym urządzeniu użytkownika, a jednocześnie oferował przewidywalne nagrody, tak aby użytkownik miał realną motywację do utrzymywania węzła online.',
    overview_layers:
      'Sieć składa się z kilku warstw logicznych: warstwy peer‑to‑peer do dystrybucji bloków i transakcji, warstwy konsensusu opartej na Proof of Stake z losowanymi komitetami walidatorów, warstwy danych z blokami, transakcjami i stanem kont oraz warstwy motywacyjnej, która określa, jak nagradzane są węzły za uczciwe zachowanie i uptime.',
    nodes_title: '2. Typy węzłów w sieci BulenCoin',
    node_mobile_title: '2.1 Mobilny węzeł light',
    node_mobile_body1:
      'Mobilny węzeł light to aplikacja uruchamiana na telefonie lub tablecie. Zamiast przechowywać pełną historię łańcucha, trzyma nagłówki bloków oraz niewielką część ostatniego stanu potrzebną do weryfikacji własnych transakcji i udziału w konsensusie.',
    node_mobile_body2:
      'Łączy się z kilkoma węzłami pełnymi, pobiera nagłówki i kryptograficzne dowody stanu, pomaga monitorować dostępność bloków i może być losowo wybierany do małych komitetów walidatorów, jeśli użytkownik zdeponował BulenCoin w stake. Aplikacja ma wbudowane mechanizmy kontroli zużycia baterii i danych, np. pracę tylko w nocy czy limity transferu komórkowego.',
    node_full_title: '2.2 Pełny węzeł desktopowy i serwerowy',
    node_full_body1:
      'Pełny węzeł działa na komputerach stacjonarnych, laptopach lub serwerach i przechowuje pełną historię bloków oraz stan kont. Weryfikuje wszystkie transakcje i bloki oraz udostępnia dane węzłom light.',
    node_full_body2:
      'Pełne węzły utrzymują tablice peerów, propagują nowe dane, mogą zostać producentami bloków przy posiadaniu stake oraz mogą udostępniać API HTTP/WebSocket jako węzły bramkowe dla aplikacji webowych i mobilnych.',
    node_gateway_title: '2.3 Węzeł bramkowy',
    node_gateway_body:
      'Węzeł bramkowy to pełny węzeł z publicznym API. Mogą z niego korzystać giełdy, operatorzy płatności oraz użytkownicy chcący mieć tylko portfel. Bramki udostępniają endpointy do wysyłania transakcji, odczytu sald i historii, z limitami zapytań i podstawową ochroną przed nadużyciami.',
    node_wallet_title: '2.4 Ultra lekki węzeł tylko portfelowy',
    node_wallet_body:
      'Na mocno ograniczonych urządzeniach użytkownik może korzystać wyłącznie z aplikacji portfelowej, która nie uczestniczy w konsensusie ani dystrybucji nagród za uptime. Łączy się ona z węzłami bramkowymi lub pracuje jako klient light w trybie tylko‑do‑odczytu, skupiając się na zarządzaniu kluczami i wygodzie użytkownika.',
    consensus_title: '3. Konsensus i motywacja',
    consensus_intro:
      'BulenCoin wykorzystuje lekki mechanizm Proof of Stake z losowanymi komitetami walidatorów. Urządzenia blokują BulenCoin jako stake, aby uczestniczyć w produkcji bloków i głosowaniu.',
    consensus_selection:
      'W każdym kroku czasu protokół deterministycznie wybiera producenta bloku oraz niewielki komitet walidatorów na podstawie poprzednich bloków, rozkładu stake i reputacji węzłów. Komitet musi wspólnie podpisać blok, aby został uznany za finalny.',
    consensus_device_type:
      'Aby promować różnorodność sprzętu, algorytm może uwzględniać typ urządzenia. Niedoreprezentowane klasy (np. telefony) mogą otrzymywać lekko podwyższony współczynnik wyboru, o ile węzeł ma wystarczający stake i dobrą historię uptime. Reputacja obniża szanse węzłów zachowujących się podejrzanie.',
    rewards_title: '3.1 Model nagród',
    rewards_blocks:
      'Model nagradzania składa się z nagród blokowych, udziału w opłatach transakcyjnych oraz nagród za uptime. Producent bloku i członkowie komitetu otrzymują część nagrody blokowej i opłat.',
    rewards_uptime:
      'Nagrody za uptime są liczone w oknach czasowych. Sieć losowo wybiera próbkę węzłów i wysyła proste zapytania health check; węzły, które konsekwentnie odpowiadają, dostają dodatkową nagrodę proporcjonalną do stake i skorygowaną współczynnikiem zależnym od typu urządzenia, tak aby zwykły sprzęt domowy mógł zarabiać sensowne kwoty tylko będąc online.',
    rewards_slashing:
      'Mechanizm slashing karze węzły, które podpisują sprzeczne bloki lub próbują ataków na konsensus, poprzez utratę części stake i obniżenie reputacji.',
    apps_title: '4. Aplikacje BulenNode',
    apps_modules_title: '4.1 Architektura węzła wieloplatformowego',
    apps_modules_body1:
      'Klient BulenNode jest podzielony na moduły: sieciowy (peer‑to‑peer i gossip), konsensusu (logika Proof of Stake), przechowywania danych (baza bloków i stanu), portfela (klucze prywatne i transakcje) oraz monitoringu zasobów (CPU, RAM, transfer i bateria).',
    apps_modules_body2:
      'Kod specyficzny dla danej platformy chowany jest za stabilnymi interfejsami, dzięki czemu ta sama logika może działać na Androidzie, iOS, Windows, macOS i Linuksie.',
    apps_mobile_title: '4.2 Aplikacja mobilna',
    apps_mobile_body:
      'Mobilna aplikacja BulenNode udostępnia tryb węzła light i tryb wyłącznie portfelowy. Użytkownik może skonfigurować, kiedy węzeł może pracować (np. tylko w nocy lub tylko w Wi‑Fi), ile danych może zużyć oraz czy może brać udział w komitetach walidatorów bezpośrednio, czy też deleguje stake do zaufanych walidatorów.',
    apps_desktop_title: '4.3 Aplikacja desktopowa',
    apps_desktop_body:
      'Na desktopie BulenNode może działać jako pełny węzeł z pełną historią lub w trybie przyciętym, z prostym GUI do wyboru ścieżki danych, limitów dysku i portów sieciowych. Może także działać jako usługa systemowa bez interfejsu.',
    apps_panel_title: '4.4 Panel użytkownika',
    apps_panel_body:
      'Wbudowany panel pokazuje aktualną wysokość bloku, liczbę peerów, szacowane zużycie danych, aktywny stake, ocenę reputacji oraz wykres ostatnich nagród, aby użytkownik mógł ocenić opłacalność utrzymywania węzła.',
    requirements_title: '5. Wymagania techniczne',
    requirements_mobile_title: '5.1 Węzły mobilne',
    requirements_mobile_body:
      'Celem są typowe smartfony z ostatnich ok. 5 lat, z co najmniej 3 GB RAM i kilkuset MB wolnego miejsca. Zużycie CPU powinno być niskie, a praca w tle musi respektować mechanizmy oszczędzania energii systemu.',
    requirements_desktop_title: '5.2 Węzły desktopowe i serwerowe',
    requirements_desktop_body:
      'Pełne węzły wymagają co najmniej 4 GB RAM, kilku GB wolnego miejsca na dysku oraz stałego połączenia z Internetem. Protokół przewiduje przycinanie historii i punkty kontrolne, aby kontrolować przyrost rozmiaru łańcucha. W konfiguracjach serwerowych zaleca się osobny dysk na dane łańcucha.',
    requirements_network_title: '5.3 Wymagania sieciowe',
    requirements_network_body:
      'Węzły, które chcą otrzymywać nagrody za uptime, muszą mieć w miarę ciągły dostęp do Internetu. Węzły desktopowe i serwerowe powinny mieć publiczne lub przekierowane porty i mogą używać technik przechodzenia przez NAT (np. hole punching). Użytkownik mobilny może ograniczyć użycie danych komórkowych i działać głównie w Wi‑Fi.',
    economics_title: '6. Ekonomia utrzymywania węzła',
    economics_income:
      'Przychód węzła składa się z nagród blokowych, udziału w opłatach transakcyjnych oraz nagród za uptime. We wczesnej fazie mainnet nagroda bazowa może być wyższa, aby mocniej wynagradzać pionierów; później większą część stanowią opłaty wynikające z realnego użycia sieci.',
    economics_costs:
      'Po stronie użytkownika kosztem jest prąd, transfer danych, zużycie sprzętu oraz ryzyko utraty części stake w przypadku złego zachowania lub błędnej konfiguracji węzła. Aplikacja BulenNode powinna prezentować szacowane zużycie energii i danych oraz wyraźnie ostrzegać o ryzyku.',
    economics_policy:
      'Emisja/opłaty: inflacja 8%→6%→4%→2.5%→1.5% (roczna, malejąca), podział nagród 60% walidator/komitet, 20% uptime/lojalność, 20% fundusz ekosystemu; opłaty: 30% spalane, 60% walidatorzy, 10% ekosystem; parametry publikowane i zmieniane tylko w wąskich widełkach governance.',
    economics_payouts:
      'Wypłaty: w testnecie symulacja dzienna (narzędzia), w mainnecie rozliczenia per epoka (~tydzień) po finalności, z publicznym kalendarzem/panelami (spalanie opłat, saldo funduszu, ID epok).',
    economics_loyalty_title: '6.1 Mnożniki wieku i lojalności',
    economics_loyalty_body:
      'Starsze węzły z ciągłym uptime i zadeklarowanym stake zarabiają więcej: +2% za miesiąc online (limit 1.5x) minus kara za przestoje, plus do +50% boost lojalności za długoterminowy stake. Bonusy wygasają po downtime i resetują się przy wypłatach lub slashowaniu.',
    economics_loyalty_point1: 'Wiek: podpisane potwierdzenia uptime; 2 dni luzu, potem degradacja.',
    economics_loyalty_point2: 'Pula lojalności: zadeklaruj 10–50% stake; pełna dojrzałość po 18 miesiącach.',
    economics_loyalty_point3: 'Bezpieczeństwo: limity (1.5x wieku, 1.5x łączny), reset przy nadużyciach.',
    roadmap_title: '7. Fazy uruchomienia i wdrożenia',
    roadmap_testnet_title: '7.1 Testnet',
    roadmap_testnet_body:
      'Pierwszym etapem uruchomienia BulenCoin jest sieć testowa. W testnecie działają węzły referencyjne utrzymywane przez zespół, a użytkownicy mogą instalować BulenNode i testować utrzymywanie węzła bez realnej wartości ekonomicznej. Testnet służy do sprawdzenia zachowania sieci na różnych typach sprzętu oraz dostrojenia parametrów konsensusu i modelu nagród.',
    roadmap_mainnet_title: '7.2 Mainnet bootstrap',
    roadmap_mainnet_body1:
      'Po zakończeniu testnetu uruchamiana jest sieć główna, w której głównymi producentami bloków są pełne węzły zespołu i społeczności z istotnym stake i stabilnym łączem. Równolegle rozwijana jest sieć węzłów mobilnych i desktopowych użytkowników, którzy dołączają do programu nagród za uptime.',
    roadmap_mainnet_body2:
      'Instrukcja setupu obejmuje pobranie aplikacji BulenNode z oficjalnych źródeł, wygenerowanie portfela i kopii zapasowej seed phrase, konfigurację ścieżki danych, portów sieciowych oraz limitów zasobów, wybór trybu pracy (pełny lub częściowy) oraz – dla osób, które nie chcą same być walidatorami – delegowanie stake do zaufanych walidatorów.',
    roadmap_decentral_title: '7.3 Pełna decentralizacja',
    roadmap_decentral_body:
      'Po ustabilizowaniu sieci udział węzłów referencyjnych w konsensusie jest stopniowo zmniejszany parametrami protokołu, aż do poziomu marginalnego. W tym samym czasie rośnie udział węzłów społeczności z historią poprawnego zachowania.',
    security_title: '8. Bezpieczeństwo i infrastruktura wspierająca',
    security_keys_title: '8.1 Ochrona kluczy prywatnych',
    security_keys_body:
      'Wszystkie węzły BulenCoin przechowują klucze prywatne użytkownika. Aplikacje muszą stosować szyfrowanie magazynu kluczy mocnym hasłem, integrację z bezpiecznymi modułami systemowymi (np. Android Keystore, iOS Secure Enclave) oraz możliwość użycia portfeli sprzętowych w aplikacjach desktopowych. Interfejs powinien jasno informować, że utrata seed phrase oznacza utratę środków, a ujawnienie seeda komukolwiek jest krytycznie niebezpieczne.',
    security_attacks_title: '8.2 Obrona przed atakami Sybil i DDoS',
    security_attacks_body:
      'Ponieważ sieć zakłada dużą liczbę tanich węzłów, jest potencjalnie podatna na ataki Sybil. Udział w konsensusie wymaga stake, a selekcja węzłów do komitetu uwzględnia zarówno stake, jak i reputację. Warstwa sieciowa stosuje m.in. rate limiting, losowanie peerów, filtrowanie ruchu i ograniczanie liczby połączeń z jednego zakresu adresów. Węzły bramkowe mogą dodatkowo wymagać prostych zadań typu proof of work przy nawiązywaniu sesji.',
    security_updates_title: '8.3 Aktualizacje protokołu',
    security_updates_body:
      'Sieć BulenCoin musi umożliwiać aktualizacje protokołu bez centralnego wyłączania. Aktualizacje oprogramowania węzłów odbywają się przez pobieranie nowych wersji klienta z oficjalnych źródeł, a hard forki są ogłaszane z wyprzedzeniem. Aplikacje zawierają mechanizmy ostrzegania o krytycznych aktualizacjach i terminach końca wsparcia starych wersji.',
    infra_title: '8.4 Eksplorator, status sieci i telemetria',
    infra_body:
      'Ekosystem BulenCoin przewiduje eksplorator bloków dostępny z poziomu przeglądarki, oficjalny serwis statusu sieci oraz anonimową telemetrię, która zbiera zagregowane statystyki o wydajności, uptime i typach urządzeń, projektowaną z zasady minimalizacji danych.',
    docs_title: 'Dokumentacja i pobrania',
    docs_subtitle:
      'W jednym miejscu: spec, przewodniki wdrożeniowe, bezpieczeństwo i nowy test integracyjny full‑stack.',
    docs_whitesheet_title: 'Whitesheet inwestorski (PL)',
    docs_whitesheet_body:
      'Skrót dla inwestorów: cel, produkt, ekonomia, bezpieczeństwo i plan wdrożenia.',
    docs_spec_title: 'Specyfikacja protokołu (PL)',
    docs_spec_body:
      'Architektura sieci, typy węzłów, konsensus, ekonomia i wymagania sprzętowe.',
    docs_overview_title: 'Overview (EN)',
    docs_overview_body: 'Angielski skrót protokołu, zachęt i etapów uruchomienia.',
    docs_deploy_title: 'Przewodniki wdrożeniowe',
    docs_deploy_body: 'Jak uruchomić węzły, eksplorator, status i konfigurację Docker.',
    docs_security_title: 'Bezpieczeństwo i zgodność',
    docs_security_body:
      'Hardening oraz kontekst prawny/AML/RODO w ujęciu koncepcyjnym.',
    docs_testing_title: 'Integracja full‑stack',
    docs_testing_body:
      'Nowy poziom testów: jednoczesne uruchomienie BulenNode, eksploratora i statusu z produkcją bloku.',
    downloads_title: 'Pobierz',
    downloads_subtitle:
      'Instalatory jednym poleceniem dla laptopów, serwerów, Raspberry Pi, macOS i Windows. Buildy mobilne (APK/TestFlight) w drodze; podpisane pakiety (.exe/.pkg/.deb/.rpm) później.',
    download_linux_cli_pill: 'CLI Linux',
    download_linux_cli_title: 'Jedna komenda na laptop/serwer',
    download_linux_cli_body:
      'Debian/Ubuntu, instalacja Node 18+ jeśli brakuje i setup bulennode.',
    download_pi_cli_pill: 'Raspberry Pi / ARM',
    download_pi_cli_title: 'Instalacja pod Pi',
    download_pi_cli_body:
      'Profil Pi 4/ARM z oszczędnymi ustawieniami i faucet off domyślnie na publicznych hostach.',
    download_macos_cli_pill: 'CLI macOS',
    download_macos_cli_title: 'Homebrew lub nvm',
    download_macos_cli_body:
      'Instaluje Node przez Homebrew lub per-user nvm, potem zależności bulennode.',
    download_windows_cli_pill: 'CLI Windows',
    download_windows_cli_title: 'Winget/Chocolatey',
    download_windows_cli_body:
      'Instaluje Node 18 LTS przez winget lub choco, potem zależności bulennode dla wskazanego profilu.',
    download_docker: 'Docker Compose',
    download_docker_body: 'Uruchom node + zależności jednym poleceniem.',
    download_signed_note:
      'Podpisane pakiety (.exe/.pkg/.deb/.rpm) później; teraz użyj instalatorów jednym poleceniem powyżej.',
    earnings_title: 'Panel zarobków',
    earnings_subtitle:
      'Widok live Twojego węzła i szybka projekcja. Korzysta z /api/status (z tokenem, jeśli ustawiony) i /api/rewards/estimate.',
    earnings_refresh: 'Odśwież',
    earnings_metrics_title: 'Metryki węzła',
    earnings_height: 'Wysokość',
    earnings_peers: 'Peery',
    earnings_uptime: 'Uptime (h)',
    earnings_reward_weight: 'Waga nagród',
    earnings_projection_title: 'Projekcja',
    earnings_stake_label: 'Stake (BULEN)',
    earnings_weekly: 'Tydzień (szac.)',
    earnings_note: 'Wartości orientacyjne; zależą od parametrów sieci.',
    earnings_error: 'Nie udało się pobrać status/rewards. Sprawdź node i tokeny.',
    faq_title: '9. FAQ – BulenCoin w praktyce',
    faq_q1: 'Czy BulenCoin to tylko hype?',
    faq_a1:
      'Nie. Branding jest memowy, ale protokół jest próbą poważnego projektu, który pokazuje, że pełna sieć kryptowalutowa może działać na zwykłych urządzeniach. Łączy on pomysły z lekkiego konsensusu, dbałości o energię i prostego utrzymywania węzła.',
    faq_q2: 'Jak zacząć utrzymywać węzeł?',
    faq_a2:
      'W testnecie i mainnecie pobierasz aplikację BulenNode z oficjalnych źródeł, tworzysz portfel i kopię zapasową seeda, wybierasz tryb węzła (mobilny light, desktopowy pełny, bramkowy lub tylko portfelowy), konfigurujesz limity zasobów oraz – opcjonalnie – stakujesz BulenCoin lub delegujesz go do walidatorów. Pełną instrukcję krok po kroku znajdziesz w przewodniku wdrożeniowym w tym repozytorium.',
    faq_q3: 'Jakie są główne ryzyka?',
    faq_a3:
      'Jak w każdej kryptowalucie, nie ma gwarancji zysku. Możesz utracić środki poprzez zgubienie seed phrase, a źle skonfigurowany lub złośliwy węzeł może zostać ukarany slashowaniem. Dodatkowo występują koszty energii, transferu danych i zużycia sprzętu. BulenCoin jest projektem eksperymentalnym i należy go tak traktować.',
    calc_title: 'Projekcja nagród',
    calc_subtitle:
      'Szacuj nagrody godzinowe/dzienne/tygodniowe na podstawie stake’u, typu urządzenia i godzin online. Dane z działającego BulenNode.',
    calc_stake_label: 'Kwota stake (BULEN)',
    calc_device_label: 'Klasa urządzenia',
    calc_uptime_label: 'Godzin online dziennie',
    calc_days_label: 'Okno projekcji (dni)',
    calc_age_label: 'Wiek węzła (dni online)',
    calc_offline_label: 'Dni offline w ostatnich 30',
    calc_loyalty_pct_label: 'Stake w puli lojalności (%)',
    calc_loyalty_months_label: 'Miesiące od ostatniej wypłaty',
    calc_button: 'Oblicz',
    calc_result_title: 'Projekcja tygodniowa',
    calc_result_subtitle: 'Wartości poglądowe; nagrody zależą od obciążenia i parametrów sieci.',
    calc_metric_hourly: 'Godzinowo',
    calc_metric_daily: 'Dziennie',
    calc_metric_weekly: 'Tygodniowo',
    calc_metric_period: 'Łącznie w okresie',
    leaderboard_title: 'Leaderboard i odznaki',
    leaderboard_subtitle:
      'Na żywo z rewards-hub: punkty za uptime/stake – dowód, że sieć żyje.',
    leaderboard_refresh: 'Odśwież',
    leaderboard_error: 'Nie udało się pobrać leaderboarda (czy rewards-hub działa/CORS?).',
    leaderboard_table_node: 'Węzeł',
    leaderboard_table_score: 'Wynik',
    leaderboard_table_stake: 'Stake',
    leaderboard_table_uptime: 'Uptime',
    leaderboard_table_badges: 'Odznaki',
    leaderboard_badges_title: 'Legenda odznak',
    leaderboard_badges_body: 'Prototyp na telemetrii; odznaki pokazują aktywne i zróżnicowane węzły.',
    leaderboard_badge_uptime: '99% uptime w oknie',
    leaderboard_badge_mobile: 'Bohater mobile/gateway',
    leaderboard_badge_staker: 'Stake ≥ 1000 BULEN',
    leaderboard_source_prefix: 'Rewards hub:',
    community_title: 'Warstwa społecznościowa: dowody, wsparcie i widoczność',
    community_subtitle:
      'Pody, rytuały i publiczne sygnały, żeby nowi widzieli kto trzyma węzły online i gdzie pytać o pomoc.',
    community_highlights_title: 'Na żywo: wkład i dowody uptime',
    community_highlights_body:
      'Strumień poprawek, dokumentacji, meetupów i węzłów z deklaracją uptime; metryki poniżej odświeżają się z danych społeczności.',
    community_metric_contributors: 'Aktywni kontrybutorzy',
    community_metric_hours: 'Godziny mentoringu w tym tygodniu',
    community_metric_nodes: 'Węzły raportujące do podów',
    community_note:
      'Feed publiczny jest opcjonalny; wpisy wygasają po 14 dniach, żeby nie było starego marketingu.',
    community_support_title: 'Pody wsparcia i rytuały',
    community_support_point1: 'Codzienne pingowanie zdrowia + podpisane potwierdzenia uptime.',
    community_support_point2: 'Cotygodniowe office hours (infra + UX wallet) i debug w parach.',
    community_support_point3: 'Moderowany czat: gotowe snippet-y do wklejenia, zero hype.',
    community_support_point4: 'Lokalne ekipy robią meetupy; notatki trafiają do docs w 24h.',
    community_support_body:
      'Chcesz pomóc? Dołącz do podu, wybierz issue z tablicy i wysyłaj z mentorem, który podpisze uptime i ścieżki nagród.',
    community_cta_join: 'Otwórz runbook operatora',
    community_tag_docs: 'docs',
    community_tag_infra: 'infra',
    community_tag_wallets: 'wallety',
    community_tag_education: 'edukacja',
    community_feed_empty: 'Brak publicznych sygnałów — włącz feed, aby pokazać swój pod.',
    partner_title: 'Program partnerski i polecenia (sensowne zasady)',
    partner_subtitle:
      'Wielopoziomowy podział przychodów z limitami, wsparcie integracyjne i przejrzyste raporty żeby partnerzy wiedzieli co zarabiają.',
    partner_tier_product: 'Partnerzy produktowi',
    partner_tier_product_title: 'Wbuduj BulenCoin w swój produkt',
    partner_tier_product_body:
      'Wallety, POS-y i narzędzia dev dostają współdzielone docs, sparring SDK i wspólne SLO. 8% success fee przez 90 dni, później 3% z progami jakości.',
    partner_tier_product_point1: 'Wspólny backlog i QA podpisane przy każdym wydaniu.',
    partner_tier_product_point2: 'Klucze sandbox + dane mock do dem.',
    partner_tier_product_point3: 'Co-marketing tylko po udowodnionym uptime.',
    partner_tier_infra: 'Infra i hosting',
    partner_tier_infra_title: 'Utrzymuj węzły i gatewaye',
    partner_tier_infra_body:
      'Operatorzy publicznych gatewayów/eksplorerów dostają wyższe stawki (do 12%) powiązane z podpisanymi potwierdzeniami uptime i SLO opóźnień.',
    partner_tier_infra_point1: 'Tokeny telemetryczne + sondy do weryfikacji uptime.',
    partner_tier_infra_point2: 'Szablony back-pressure i rate limit na starcie.',
    partner_tier_infra_point3: 'Kanał incydentowy z ludźmi, nie botami.',
    partner_tier_creator: 'Twórcy i lokalne ekipy',
    partner_tier_creator_title: 'Ucz, tłumacz, organizuj meetupy',
    partner_tier_creator_body:
      'Lokalni liderzy dostają granty + śledzone polecenia gdy warsztaty przekładają się na realne węzły. Comiesięczne dashboardy potwierdzające wpływ.',
    partner_tier_creator_point1: 'Zestawy startowe: slajdy, dema, materiały z QR.',
    partner_tier_creator_point2: 'Budżet na tłumaczenia z review zespołu core.',
    partner_tier_creator_point3: 'ID poleceń mapowane do portfeli dla przejrzystych wypłat.',
    referral_calc_title: 'Kalkulator poleceń',
    referral_calc_subtitle:
      'Szacuj miesięczne wypłaty z limitami. Podstawa + bonus za niezawodność liczony z uptime węzła.',
    referral_role_label: 'Typ partnera',
    referral_role_product: 'Produkt / app',
    referral_role_infra: 'Infra',
    referral_role_creator: 'Twórca / społeczność',
    referral_referrals_label: 'Kwalifikowane leady / miesiąc',
    referral_conversion_label: 'Konwersja (%)',
    referral_value_label: 'Średni wolumen miesięczny na konwersję (BULEN)',
    referral_uptime_label: 'Twój uptime (0-100%)',
    referral_calc_button: 'Policz',
    referral_metric_monthly: 'Prognoza miesięczna',
    referral_metric_bonus: 'Bonus za niezawodność',
    referral_metric_pool: 'Wpływ na pulę ekosystemu',
    referral_code_title: 'Pobierz kod polecający',
    referral_code_subtitle:
      'Wygeneruj deterministyczny kod do udostępnienia; później przypniesz go do portfela bez zmiany linków.',
    referral_code_handle: 'Twoja marka / ID węzła',
    referral_code_contact: 'Kontakt (do akceptacji)',
    referral_code_button: 'Generuj kod',
    referral_code_result_label: 'Kod',
    referral_code_note:
      'Kody używają HMAC + timestamp, więc są unikalne i weryfikowalne; dodaj je do ofert lub onboardingu.',
    referral_error_inputs: 'Podaj dodatnie liczby dla leadów, konwersji i wolumenu.',
    referral_code_error: 'Dodaj swoją markę/ID węzła przed wygenerowaniem kodu.',
    onboarding_title: 'Start w 5 minut (testnet)',
    onboarding_body:
      'Weź tokeny testowe, zainstaluj pakiet „jednym kliknięciem”, utwórz portfel z kopią seed i dołącz do sieci na bezpiecznych ustawieniach. Działa na desktopie, gateway i w trybie mobile light.',
    onboarding_step1_title: '1) Testowe BULEN',
    onboarding_step1_body:
      'Faucet: curl -X POST http://localhost:4100/api/faucet -d \'{"address":"alice"}\' albo formularz w UI BulenNode.',
    onboarding_step2_title: '2) Instalacja',
    onboarding_step2_body:
      'Instalatory desktop/gateway (patrz Downloads) lub npm start w bulennode/. Profil mobile light przycina stan.',
    onboarding_step3_title: '3) Portfel i backup',
    onboarding_step3_body:
      'Wygeneruj portfel, zapisz seed, zrób zaszyfrowany backup. Węzeł trzyma checkpoint, więc po restarcie nie trzeba pełnej resynchronizacji.',
    onboarding_step4_title: '4) Podgląd nagród',
    onboarding_step4_body:
      'Otwórz /api/status lub eksplorator aby zobaczyć wysokość, stake, boosty uptime i prognozę tygodniową.',
    onboarding_cta_title: 'Pakiety „one-click”',
    onboarding_desktop: 'Walidator desktop/laptop (desktop-full)',
    onboarding_gateway: 'Profil gateway/API (gateway)',
    onboarding_mobile: 'Profil mobile light (oszczędzanie baterii)',
    onboarding_note:
      'Wkrótce: wideo krok-po-kroku i gotowe binarki. Na razie korzystaj z poradników lub Docker Compose z repo.',
    wallet_creator_title: 'Załóż portfel w każdej wersji węzła',
    wallet_creator_subtitle:
      'Desktop, gateway i mobile mają ten sam prosty flow: lokalne generowanie seeda, zapisanie go i natychmiastowy adres.',
    wallet_creator_desktop_title: 'Walidator desktop / server',
    wallet_creator_desktop_body:
      'Portfel dla pełnych węzłów nastawionych na uptime i stake. Klucze zostają na tym urządzeniu.',
    wallet_creator_gateway_title: 'Węzeł gateway / API',
    wallet_creator_gateway_body:
      'Portfel do przyjmowania płatności przez API/eksplorator; trzymaj tokeny i TLS włączone.',
    wallet_creator_mobile_title: 'Węzeł lekki mobilny / companion',
    wallet_creator_mobile_body:
      'Tryb oszczędny: seed offline, szybka synchronizacja gdy jest Wi‑Fi lub zasięg.',
    wallet_creator_seed_label: 'Słowa seeda (12)',
    wallet_creator_seed_hint:
      'Generowane lokalnie; kliknij „Generuj portfel”, aby utworzyć nowy seed.',
    wallet_creator_seed_generated: 'Klucz wygenerowany lokalnie. Backup poniżej.',
    wallet_creator_address_label: 'Adres',
    wallet_creator_address_hint: 'Wygeneruj, aby zobaczyć adres.',
    wallet_creator_generate: 'Generuj portfel',
    wallet_creator_copy_seed: 'Kopiuj seed',
    wallet_creator_backup_label: 'Backup',
    wallet_creator_backup_check: 'Zapisałem seed / backup',
    wallet_creator_backup:
      'Generacja jest tylko lokalna; zapisz seed offline zanim postawisz stake.',
    wallet_creator_passphrase_label: 'Hasło szyfrujące',
    wallet_creator_passphrase_hint: 'Używane do szyfrowania lokalnego keystore; minimum 12 znaków.',
    wallet_creator_passphrase_error:
      'Podaj hasło (min 12 znaków), aby bezpiecznie wygenerować portfel.',
    wallet_import_title: 'Zaimportuj istniejący portfel',
    wallet_import_body:
      'Wklej zaszyfrowany backup z innego urządzenia i odblokuj hasłem, aby używać tego samego adresu wszędzie.',
    wallet_import_paste_label: 'Wklej backup (PEM)',
    wallet_import_button: 'Importuj portfel',
    wallet_import_success: 'Portfel zaimportowany. Adres: {address}',
    wallet_import_error: 'Nie udało się zaimportować backupu. Sprawdź hasło i PEM.',
    deploy_title: 'Uruchom w 5 minut',
    deploy_subtitle:
      'Wybierz platformę: instalator desktop/gateway lub aplikacja mobilna. Buildy testnet startują z bezpiecznymi domyślnymi, faucet i telemetria są domyślnie wyłączone.',
    deploy_desktop_title: 'Desktop / serwer',
    deploy_desktop_body:
      'Pobierz instalator lub użyj Docker Compose. Uruchom z profilem desktop-full lub gateway, potem odwiedź /api/status.',
    deploy_guide: 'Otwórz przewodnik instalacji',
    deploy_compose: 'Docker Compose',
    deploy_mobile_title: 'Uruchom na telefonie',
    deploy_mobile_body:
      'Lekki węzeł z agresywnym pruningiem i trybem oszczędzania baterii. APK/TestFlight już wkrótce; albo sparuj z gatewayem do podglądu tylko-odczyt.',
    deploy_mobile_learn: 'Zobacz profil mobilny',
    deploy_mobile_soon: 'APK/TestFlight – wkrótce',
    footer_note:
      'BulenCoin jest projektem eksperymentalnym. Ta strona opisuje proponowany projekt sieci i nie stanowi porady inwestycyjnej, prawnej ani podatkowej. Utrzymywanie węzłów lub usług w oparciu o ten projekt może podlegać regulacjom w Twojej jurysdykcji – za zgodność z prawem odpowiadasz samodzielnie.',
    wallet_title: 'Portfel i linki płatności',
    wallet_body:
      'Generuj linki płatności w stylu BIP21 i kody QR do faktur. Idealne dla web/mobile wallet i szybkich przycisków płatności.',
    wallet_address_label: 'Adres docelowy',
    wallet_amount_label: 'Kwota (BULEN)',
    wallet_memo_label: 'Memo (opcjonalnie)',
    wallet_button: 'Generuj link i QR',
    wallet_result_title: 'Twój link płatności',
    wallet_link_label: 'Link',
    wallet_qr_label: 'Kod QR',
    wallet_copy: 'Kopiuj',
  },
};

const apiBase = window.BULEN_API_BASE || 'http://localhost:4100/api';
const explorerBase = window.BULEN_EXPLORER_BASE || '';
const statusBase = window.BULEN_STATUS_BASE || '';
const rewardsHubBase = window.REWARDS_HUB_BASE || 'http://localhost:4400';
const createElement = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'text') {
      el.textContent = value;
    } else {
      el.setAttribute(key, value);
    }
  });
  children.forEach((child) => el.appendChild(child));
  return el;
};

function applyTranslations(lang) {
  const dict = translations[lang] || translations.en;
  document.documentElement.lang = lang;

  // Elements with data-i18n (full text)
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Elements with data-i18n-label (typically labels or nav items)
  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-label');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('language');
  const preferred =
    (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
  const dict = () => translations[select.value] || translations.en;
  const communityApi = (typeof window !== 'undefined' && window.BulenCommunity) || {};
  let rerenderWalletCards = () => {};
  let hydrateFormsWithAddress = () => {};

  if (translations[preferred]) {
    select.value = preferred;
  }

  applyTranslations(select.value);

  select.addEventListener('change', () => {
    applyTranslations(select.value);
    rerenderWalletCards();
  });

  const form = document.getElementById('reward-form');
  if (form) {
    const errorEl = document.getElementById('calc-error');
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const stake = Number(document.getElementById('calc-stake').value || 0);
      const deviceClass = document.getElementById('calc-device').value;
      const uptimeHoursPerDay = Number(document.getElementById('calc-uptime').value || 0);
      const days = Number(document.getElementById('calc-days').value || 0);
      const ageDays = Number(document.getElementById('calc-age-days').value || 0);
      const offlineDays = Number(document.getElementById('calc-offline-days').value || 0);
      const loyaltyPct = Number(document.getElementById('calc-loyalty-pct').value || 0);
      const loyaltyMonths = Number(document.getElementById('calc-loyalty-months').value || 0);
      if (errorEl) {
        errorEl.hidden = true;
      }
      try {
        const res = await fetch(`${apiBase}/rewards/estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stake, uptimeHoursPerDay, days, deviceClass }),
        });
        if (!res.ok) {
          throw new Error(`API responded ${res.status}`);
        }
        const data = await res.json();
        const proj = data.projection || {};
        const ageMultiplier = communityApi.computeAgeMultiplier
          ? communityApi.computeAgeMultiplier(ageDays, offlineDays)
          : 1;
        const loyaltyMultiplier = communityApi.computeLoyaltyMultiplier
          ? communityApi.computeLoyaltyMultiplier(loyaltyPct, loyaltyMonths)
          : 1;
        const adjusted = communityApi.projectLoyaltyAdjustedRewards
          ? communityApi.projectLoyaltyAdjustedRewards(proj, { ageMultiplier, loyaltyMultiplier })
          : proj;
        const fmt = (val) =>
          typeof val === 'number' ? val.toFixed(2).replace(/\.00$/, '') : '–';
        setText('calc-hourly', fmt(adjusted.hourly || proj.hourly));
        setText('calc-daily', fmt(adjusted.daily || proj.daily));
        setText('calc-weekly', fmt(adjusted.weekly || proj.weekly));
        setText('calc-period', fmt(adjusted.periodTotal || proj.periodTotal));
        setText('calc-badge-age', `Age x${fmt(ageMultiplier)}`);
        setText('calc-badge-loyalty', `Loyalty x${fmt(loyaltyMultiplier)}`);
        setText('calc-badge-device', `Device x${fmt(proj.deviceBoost || 1)}`);
        setText('calc-badge-stake', `Stake weight x${fmt(proj.stakeWeight || 1)}`);
        const total =
          (proj.deviceBoost || 1) * (proj.stakeWeight || 1) * ageMultiplier * loyaltyMultiplier;
        setText('calc-badge-total', `Total x${fmt(total)}`);
      } catch (error) {
        console.error('Reward estimate failed', error);
        if (errorEl) {
          errorEl.textContent =
            'Unable to fetch projection from node. Is BulenNode running at ' + apiBase + '?';
          errorEl.hidden = false;
        }
      }
    });

    const evt = new Event('submit', { bubbles: true, cancelable: true, composed: true });
    form.dispatchEvent(evt);
  }

  const leaderboardTable = document.getElementById('leaderboard-table');
  if (leaderboardTable) {
    const errorEl = document.getElementById('leaderboard-error');
    const sourceEl = document.getElementById('leaderboard-source');
    const refreshBtn = document.getElementById('leaderboard-refresh');
    if (sourceEl) {
      sourceEl.textContent = rewardsHubBase;
    }

    const renderRows = (entries) => {
      leaderboardTable.innerHTML = '';
      if (!entries.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'No telemetry yet';
        row.appendChild(cell);
        leaderboardTable.appendChild(row);
        return;
      }
      entries.slice(0, 5).forEach((entry) => {
        const row = document.createElement('tr');
        const nodeCell = document.createElement('td');
        nodeCell.textContent = entry.nodeId || 'unknown';
        if (entry.deviceClass) {
          const pill = document.createElement('span');
          pill.className = 'bc-pill';
          pill.style.marginLeft = '0.5rem';
          pill.textContent = entry.deviceClass;
          nodeCell.appendChild(pill);
        }
        const scoreCell = document.createElement('td');
        scoreCell.textContent = Number(entry.score || 0).toFixed(2);
        const stakeCell = document.createElement('td');
        stakeCell.textContent = String(entry.stake || 0);
        const uptimeCell = document.createElement('td');
        uptimeCell.textContent = `${Math.round((entry.uptimePercent || 0) * 100)}%`;
        const badgeCell = document.createElement('td');
        const badges = entry.badges || [];
        if (badges.length) {
          badges.forEach((badge) => {
            const span = document.createElement('span');
            span.className = 'bc-badge';
            span.style.marginRight = '0.3rem';
            span.textContent = badge;
            badgeCell.appendChild(span);
          });
        } else {
          badgeCell.textContent = '–';
        }
        [nodeCell, scoreCell, stakeCell, uptimeCell, badgeCell].forEach((cell) =>
          row.appendChild(cell),
        );
        leaderboardTable.appendChild(row);
      });
    };

    const loadLeaderboard = async () => {
      if (errorEl) {
        errorEl.hidden = true;
      }
      try {
        const res = await fetch(`${rewardsHubBase}/leaderboard`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        renderRows(data.entries || []);
      } catch (error) {
        console.error('leaderboard error', error);
        if (errorEl) {
          errorEl.textContent = dict().leaderboard_error || 'Unable to load leaderboard.';
          errorEl.hidden = false;
        }
      }
    };

    refreshBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      loadLeaderboard();
    });

    loadLeaderboard();
  }

  const communityFeed = document.getElementById('community-feed');
  if (communityFeed && communityApi.buildCommunitySnapshot) {
    const contributorsEl = document.getElementById('community-contributors');
    const hoursEl = document.getElementById('community-hours');
    const nodesEl = document.getElementById('community-nodes');
    const emptyText =
      dict().community_feed_empty ||
      'No public signals yet — opt in to show your pod and signed uptime receipts.';
    const renderCommunity = () => {
      try {
        const { stats, feed } = communityApi.buildCommunitySnapshot();
        if (contributorsEl) contributorsEl.textContent = stats.contributors || '0';
        if (hoursEl) hoursEl.textContent = (stats.mentorHours || 0).toFixed(1).replace(/\.0$/, '');
        if (nodesEl) nodesEl.textContent = stats.nodes || '0';
        communityFeed.innerHTML = '';
        const entries = feed || [];
        if (!entries.length) {
          const li = document.createElement('li');
          li.textContent = emptyText;
          communityFeed.appendChild(li);
          return;
        }
        entries.forEach((entry) => {
          const li = document.createElement('li');
          const title = document.createElement('div');
          title.textContent = entry.summary || entry.handle || 'Community update';
          const meta = document.createElement('div');
          meta.className = 'bc-muted';
          meta.textContent = `${entry.handle || 'anon'} · ${entry.type || 'pod'} · impact ${entry.impact || '–'}`;
          li.appendChild(title);
          li.appendChild(meta);
          communityFeed.appendChild(li);
        });
      } catch (error) {
        console.error('community render failed', error);
      }
    };
    renderCommunity();
  }

  const referralForm = document.getElementById('referral-form');
  if (referralForm) {
    const roleEl = document.getElementById('partner-role');
    const leadsEl = document.getElementById('partner-referrals');
    const conversionEl = document.getElementById('partner-conversion');
    const valueEl = document.getElementById('partner-value');
    const uptimeEl = document.getElementById('partner-uptime');
    const monthlyEl = document.getElementById('referral-monthly');
    const bonusEl = document.getElementById('referral-bonus');
    const poolEl = document.getElementById('referral-pool');
    const errorEl = document.getElementById('referral-error');
    const setError = (msg) => {
      if (!errorEl) return;
      errorEl.textContent = msg || '';
      errorEl.hidden = !msg;
    };
    const fallbackCalc = ({ leads, conversionRate, avgVolume, uptime, role }) => {
      const conversion = Math.min(100, Math.max(0, conversionRate));
      const converted = leads * (conversion / 100);
      const gross = converted * avgVolume;
      const baseRate = role === 'infra' ? 0.1 : role === 'creator' ? 0.06 : 0.08;
      const bonusRate = role === 'infra' ? 0.07 : role === 'creator' ? 0.045 : 0.05;
      const base = gross * baseRate;
      const bonus = base * bonusRate * Math.min(1.1, Math.max(0.6, uptime / 100));
      return {
        monthlyPayout: base + bonus,
        bonus,
        poolImpact: gross * 0.02,
      };
    };
    const format = (val) =>
      typeof val === 'number' && Number.isFinite(val)
        ? val.toFixed(2).replace(/\.00$/, '')
        : '–';
    const runCalc = (event) => {
      if (event) event.preventDefault();
      setError('');
      const role = roleEl?.value || 'product';
      const leads = Number(leadsEl?.value || 0);
      const conversionRate = Number(conversionEl?.value || 0);
      const avgVolume = Number(valueEl?.value || 0);
      const uptime = Number(uptimeEl?.value || 0);
      if ([leads, conversionRate, avgVolume].some((n) => !Number.isFinite(n) || n < 0)) {
        setError(dict().referral_error_inputs || 'Enter positive numbers for the calculator.');
        return;
      }
      try {
        const result = communityApi.calculatePartnerPayout
          ? communityApi.calculatePartnerPayout({ role, leads, conversionRate, avgVolume, uptime })
          : fallbackCalc({ role, leads, conversionRate, avgVolume, uptime });
        if (monthlyEl) monthlyEl.textContent = format(result.monthlyPayout);
        if (bonusEl) bonusEl.textContent = format(result.bonus);
        if (poolEl) poolEl.textContent = format(result.poolImpact);
      } catch (error) {
        console.error('referral calc failed', error);
        setError(dict().referral_error_inputs || 'Enter valid numbers to calculate payouts.');
      }
    };
    referralForm.addEventListener('submit', runCalc);
    runCalc();
  }

  const codeBtn = document.getElementById('partner-generate');
  if (codeBtn) {
    const handleEl = document.getElementById('partner-handle');
    const contactEl = document.getElementById('partner-contact');
    const codeEl = document.getElementById('partner-code');
    const errorEl = document.getElementById('referral-error');
    const setError = (msg) => {
      if (!errorEl) return;
      errorEl.textContent = msg || '';
      errorEl.hidden = !msg;
    };
    codeBtn.addEventListener('click', () => {
      setError('');
      const handle = handleEl?.value || '';
      const contact = contactEl?.value || '';
      try {
        const code = communityApi.generateReferralCode
          ? communityApi.generateReferralCode(handle, contact)
          : `BULEN-${(handle || 'PARTNER').toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        if (codeEl) codeEl.textContent = code;
      } catch (error) {
        console.error('referral code error', error);
        setError(dict().referral_code_error || 'Add your brand/node ID before generating a code.');
      }
    });
  }

  const walletProfiles = Array.from(document.querySelectorAll('[data-wallet-card]')).map(
    (card) => card.dataset.walletCard,
  );
  if (walletProfiles.length) {
    const walletState = {};
    const getEl = (attr, profile) =>
      document.querySelector(`[data-${attr}="${profile}"]`) ||
      document.querySelector(`[data-${attr}=${profile}]`);
    const setStatus = (profile, message, tone = 'muted') => {
      const el = document.querySelector(`[data-wallet-status="${profile}"]`);
      if (!el) return;
      el.textContent = message || '';
      el.style.color = tone === 'success' ? '#6ee7b7' : tone === 'error' ? '#fca5a5' : 'var(--muted)';
    };
    const renderWalletCard = (profile) => {
      const addrEl = getEl('wallet-address', profile);
      const seedEl = getEl('wallet-seed', profile);
      const backupEl = getEl('wallet-backup', profile);
      const checkbox = document.querySelector(`[data-wallet-backed="${profile}"]`);
      const passEl = getEl('wallet-passphrase', profile);
      if (!addrEl || !seedEl) return;
      const state = walletState[profile];
      if (state && state.address && state.seed) {
        addrEl.textContent = state.address;
        seedEl.textContent = state.seed;
        if (backupEl) {
          backupEl.textContent = state.backup || (dict().wallet_creator_seed_hint || '');
        }
        if (checkbox) {
          checkbox.disabled = false;
          checkbox.checked = Boolean(state.backedUp);
        }
        if (passEl) {
          passEl.value = state.passphrase || '';
        }
      } else {
        addrEl.textContent = dict().wallet_creator_address_hint || 'Generate to see address.';
        seedEl.textContent =
          dict().wallet_creator_seed_hint ||
          'Generated locally; click “Generate wallet” to create a fresh seed.';
        if (backupEl) {
          backupEl.textContent = 'Backup will appear here after generation. Store it offline.';
        }
        if (checkbox) {
          checkbox.disabled = true;
          checkbox.checked = false;
        }
        if (passEl) {
          passEl.value = '';
        }
      }
    };

    const renderAllWalletCards = () => {
      walletProfiles.forEach((profile) => renderWalletCard(profile));
    };

    hydrateFormsWithAddress = (address) => {
      const walletAddressInput = document.getElementById('wallet-address');
      if (walletAddressInput) {
        walletAddressInput.value = address;
      }
      const stakeInput = document.getElementById('calc-stake-address');
      if (stakeInput) {
        stakeInput.value = address;
      }
    };

    const generateWallet = async (profile) => {
      setStatus(profile, dict().wallet_creator_generate || 'Generating…');
      const passInput = getEl('wallet-passphrase', profile);
      const passphrase = passInput ? passInput.value : '';
      const minPass = 12;
      if (!passphrase || passphrase.length < minPass) {
        setStatus(profile, dict().wallet_creator_passphrase_error || 'Passphrase too short.', 'error');
        return;
      }
      try {
        const res = await fetch(`${apiBase}/wallets/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: `${profile} wallet`, profile, passphrase }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const backupPem = (data.backup && data.backup.privateKeyPem) || '';
        walletState[profile] = {
          address: data.address,
          seed:
            dict().wallet_creator_seed_generated ||
            'Key generated locally. Backup below.',
          backup: backupPem,
          backedUp: false,
          passphrase,
        };
        setStatus(profile, 'Wallet generated. Save the backup locally.', 'success');
        renderWalletCard(profile);
        hydrateFormsWithAddress(data.address);
      } catch (error) {
        console.error('wallet generate error', error);
        setStatus(profile, 'Could not create wallet. Is BulenNode running?', 'error');
      }
    };

    document.querySelectorAll('[data-wallet-generate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const profile = btn.dataset.walletGenerate;
        generateWallet(profile);
      });
    });

    document.querySelectorAll('[data-wallet-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const profile = btn.dataset.walletCopy;
        const state = walletState[profile];
        const toCopy = state?.backup || state?.seed;
        if (toCopy && navigator.clipboard) {
          navigator.clipboard.writeText(toCopy).catch(() => {});
        }
      });
    });

    document.querySelectorAll('[data-wallet-backed]').forEach((checkbox) => {
      checkbox.addEventListener('change', async () => {
        const profile = checkbox.dataset.walletBacked;
        const state = walletState[profile];
        if (!state?.address) return;
        if (!checkbox.checked) {
          state.backedUp = false;
          setStatus(profile, '');
          return;
        }
        try {
          const res = await fetch(`${apiBase}/wallets/backup-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: state.address }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          state.backedUp = true;
          setStatus(profile, 'Backup confirmed.', 'success');
        } catch (error) {
          console.error('backup confirm error', error);
          checkbox.checked = false;
          state.backedUp = false;
          setStatus(profile, 'Could not record backup confirmation.', 'error');
        }
      });
    });

    rerenderWalletCards = renderAllWalletCards;
    renderAllWalletCards();
  }

  const earningsRefresh = document.getElementById('earnings-refresh');
  if (earningsRefresh) {
    const errEl = document.getElementById('earnings-error');
    const heightEl = document.getElementById('earnings-height');
    const peersEl = document.getElementById('earnings-peers');
    const uptimeEl = document.getElementById('earnings-uptime');
    const weightEl = document.getElementById('earnings-weight');
    const weeklyEl = document.getElementById('earnings-weekly');
    const stakeInput = document.getElementById('earnings-stake');
    const tokenInput = document.getElementById('earnings-token');

    const setError = (msg) => {
      if (!errEl) return;
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
    };

    const refresh = async () => {
      setError('');
      const statusHeaders = { 'Content-Type': 'application/json' };
      const tokenVal = (tokenInput && tokenInput.value.trim()) || '';
      if (tokenVal) {
        statusHeaders['x-bulen-status-token'] = tokenVal;
      }
      try {
        const statusRes = await fetch(`${apiBase}/status`, { headers: statusHeaders });
        if (!statusRes.ok) {
          throw new Error(`Status HTTP ${statusRes.status}`);
        }
        const statusData = await statusRes.json();
        const height =
          statusData.height ||
          statusData.blockHeight ||
          (statusData.state && statusData.state.height) ||
          0;
        const peers =
          (statusData.peers && statusData.peers.length) ||
          statusData.peerCount ||
          (statusData.peerBook && statusData.peerBook.length) ||
          0;
        const uptimeSeconds =
          (statusData.metrics && statusData.metrics.uptimeSeconds) ||
          statusData.uptimeSeconds ||
          0;
        const rewardWeight =
          (statusData.metrics && statusData.metrics.rewardWeight) ||
          statusData.rewardWeight ||
          1;
        const deviceClass =
          (statusData.metrics && statusData.metrics.deviceClass) ||
          statusData.deviceClass ||
          'desktop';

        if (heightEl) heightEl.textContent = height;
        if (peersEl) peersEl.textContent = peers;
        if (uptimeEl) uptimeEl.textContent = (uptimeSeconds / 3600).toFixed(1);
        if (weightEl) weightEl.textContent = Number(rewardWeight).toFixed(2);

        const stake = Number(stakeInput?.value || 0);
        const uptimeHours = Math.min(24, uptimeSeconds / 3600 || 24);
        const estimateRes = await fetch(`${apiBase}/rewards/estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stake,
            uptimeHoursPerDay: uptimeHours,
            days: 7,
            deviceClass,
          }),
        });
        if (estimateRes.ok) {
          const est = await estimateRes.json();
          const weekly = est.projection && est.projection.weekly ? est.projection.weekly : null;
          if (weeklyEl) {
            weeklyEl.textContent =
              typeof weekly === 'number' ? weekly.toFixed(2).replace(/\.00$/, '') : '–';
          }
        } else {
          throw new Error(`Estimate HTTP ${estimateRes.status}`);
        }
      } catch (error) {
        console.error('earnings refresh failed', error);
        setError(dict().earnings_error || 'Unable to load status/rewards.');
      }
    };

    earningsRefresh.addEventListener('click', (event) => {
      event.preventDefault();
      refresh();
    });

    refresh();
  }

  const liveLinks = document.getElementById('live-links');
  if (liveLinks) {
    const apiLink = document.getElementById('live-link-api');
    const explorerLink = document.getElementById('live-link-explorer');
    const statusLink = document.getElementById('live-link-status');

    const setLink = (el, url) => {
      if (!el) return;
      if (url) {
        el.href = url;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    };

    (async () => {
      try {
        const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`health ${res.status}`);
        setLink(apiLink, apiBase);
        setLink(explorerLink, explorerBase);
        setLink(statusLink, statusBase);
        liveLinks.hidden = false;
      } catch (err) {
        // node not reachable; keep hidden
        console.warn('live links not shown:', err.message || err);
      }
    })();
  }

  const walletForm = document.getElementById('wallet-form');
  if (walletForm) {
    const errEl = document.getElementById('wallet-error');
    const linkEl = document.getElementById('wallet-link');
    const qrEl = document.getElementById('wallet-qr');
    const copyBtn = document.getElementById('wallet-copy');

    const setError = (msg) => {
      if (errEl) {
        errEl.textContent = msg;
        errEl.hidden = !msg;
      }
    };

    copyBtn?.addEventListener('click', () => {
      if (linkEl && linkEl.textContent && linkEl.textContent !== '–') {
        navigator.clipboard.writeText(linkEl.textContent).catch(() => {});
      }
    });

    walletForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');
      const address = document.getElementById('wallet-address').value.trim();
      const amount = Number(document.getElementById('wallet-amount').value || 0);
      const memo = document.getElementById('wallet-memo').value.trim();
      if (!address || Number.isNaN(amount) || amount <= 0) {
        setError('Please provide a valid address and amount.');
        return;
      }
      try {
        const res = await fetch(`${apiBase}/payment-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, amount, memo }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        linkEl.textContent = data.link;
        if (data.qrDataUrl) {
          const img = createElement('img', { src: data.qrDataUrl, alt: 'QR code', style: 'max-width:140px;' });
          qrEl.innerHTML = '';
          qrEl.appendChild(img);
        } else {
          qrEl.textContent = 'QR unavailable';
        }
      } catch (error) {
        console.error('payment link error', error);
        setError('Could not generate link/QR. Is BulenNode running?');
      }
    });
  }

  const importBtn = document.getElementById('wallet-import-btn');
  if (importBtn) {
    const statusEl = document.getElementById('wallet-import-status');
    const pemEl = document.getElementById('wallet-import-pem');
    const passEl = document.getElementById('wallet-import-pass');
    const setStatus = (msg, tone = 'muted') => {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.style.color =
        tone === 'success' ? '#6ee7b7' : tone === 'error' ? '#fca5a5' : 'var(--muted)';
    };
    importBtn.addEventListener('click', async () => {
      const backup = (pemEl?.value || '').trim();
      const passphrase = passEl?.value || '';
      if (!backup) {
        setStatus(dict().wallet_import_error || 'Paste an encrypted backup first.', 'error');
        return;
      }
      setStatus('Importing...', 'muted');
      try {
        const res = await fetch(`${apiBase}/wallets/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backup, passphrase, label: 'imported', profile: 'migrated' }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const addr = data.address || '';
        const template = dict().wallet_import_success || 'Wallet imported.';
        setStatus(template.replace('{address}', addr), 'success');
        if (addr) {
          hydrateFormsWithAddress(addr);
        }
      } catch (error) {
        console.error('wallet import error', error);
        setStatus(dict().wallet_import_error || 'Could not import backup.', 'error');
      }
    });
  }
});
