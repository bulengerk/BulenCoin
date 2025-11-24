const translations = {
  en: {
    nav_overview: 'Overview',
    nav_nodes: 'Nodes',
    nav_consensus: 'Consensus',
    nav_economics: 'Economics',
    nav_apps: 'Apps',
    nav_security: 'Security',
    nav_docs: 'Docs',
    nav_roadmap: 'Roadmap',
    choose_language: 'Language',
    hero_title: 'BulenCoin – a meme coin with a serious distributed systems heart',
    hero_subtitle:
      'A lightweight, Proof of Stake–based network designed to run on everything from smartphones to servers, rewarding users for keeping real nodes online.',
    hero_cta_docs: 'Docs & downloads',
    hero_cta_whitesheet: 'Whitesheet (PL, PDF)',
    chip_mobile: 'Mobile · desktop · server ready',
    chip_uptime: 'Uptime rewards baked in',
    chip_multilingual: 'Docs: PL / EN / ES',
    hero_highlight_api: 'On-chain payments API with memo binding',
    hero_highlight_wallets: 'Wallet challenge/verify for MetaMask, WalletConnect, Ledger',
    hero_highlight_tests: 'Full-stack tests ship with the stack (node + explorer + status)',
    hero_card1_title: 'Runs everywhere',
    hero_card1_body:
      'Mobile, desktop and server nodes cooperate in one network. Phones and tablets can participate without burning the battery.',
    hero_card2_title: 'Lightweight Proof of Stake',
    hero_card2_body:
      'No mining farms. Validators are chosen by stake, device type and reputation, with small committees that sign blocks.',
    hero_card3_title: 'Uptime‑based rewards',
    hero_card3_body:
      'Nodes that stay online and respond to health checks regularly earn additional rewards, with parameters calibrated for everyday hardware.',
    overview_title: '1. What is BulenCoin?',
    overview_intro:
      'BulenCoin is a meme‑themed cryptocurrency with a serious engineering goal: to prove that a modern blockchain network can be maintained by the widest possible spectrum of devices – from phones and tablets, through laptops and desktops, up to cloud servers.',
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
    faq_q1: 'Is BulenCoin only a meme?',
    faq_a1:
      'No. The brand is playful, but the protocol is designed as a serious experiment in running a full crypto network on mainstream devices, combining research ideas from lightweight consensus, energy awareness and user‑friendly node operation.',
    faq_q2: 'How do I start running a node?',
    faq_a2:
      'In testnet and mainnet, you download BulenNode from official sources, create a wallet and seed backup, choose your node mode (mobile light, desktop full, gateway, or wallet‑only), configure resource limits, and optionally stake or delegate your BulenCoin. See the deployment guide in this repository for a full step‑by‑step description.',
    faq_q3: 'What are the main risks?',
    faq_a3:
      'As with any cryptocurrency, there is no guaranteed profit. You can lose access to your funds by losing your seed phrase, and a misconfigured or malicious node may be slashed. Hardware, electricity and data usage also have a cost. BulenCoin is an experimental project and should be treated as such.',
    footer_note:
      'BulenCoin is an experimental project. This website describes a proposed network design and does not constitute financial, legal or tax advice. Operating nodes or services based on this design may be regulated in your jurisdiction; you are responsible for complying with local law.',
  },
  es: {
    nav_overview: 'Visión general',
    nav_nodes: 'Nodos',
    nav_consensus: 'Consenso',
    nav_economics: 'Economía',
    nav_apps: 'Aplicaciones',
    nav_security: 'Seguridad',
    nav_docs: 'Documentación',
    nav_roadmap: 'Hoja de ruta',
    choose_language: 'Idioma',
    hero_title:
      'BulenCoin – un meme coin con un núcleo serio de sistemas distribuidos',
    hero_subtitle:
      'Una red ligera basada en Proof of Stake, diseñada para funcionar en todo, desde smartphones hasta servidores, recompensando a los usuarios por mantener nodos reales en línea.',
    hero_cta_docs: 'Documentación y descargas',
    hero_cta_whitesheet: 'Whitesheet (PL, PDF)',
    chip_mobile: 'Listo para móvil · escritorio · servidor',
    chip_uptime: 'Recompensas por disponibilidad integradas',
    chip_multilingual: 'Docs: PL / EN / ES',
    hero_highlight_api: 'API de pagos on-chain con memo',
    hero_highlight_wallets: 'Challenge/verify de wallets: MetaMask, WalletConnect, Ledger',
    hero_highlight_tests: 'Tests full-stack incluidos (nodo + explorer + status)',
    hero_card1_title: 'Funciona en todas partes',
    hero_card1_body:
      'Nodos móviles, de escritorio y de servidor cooperan en una sola red. Los teléfonos y las tabletas pueden participar sin destruir la batería.',
    hero_card2_title: 'Proof of Stake ligero',
    hero_card2_body:
      'Sin granjas de minería. Los validadores se eligen según stake, tipo de dispositivo y reputación, con pequeños comités que firman bloques.',
    hero_card3_title: 'Recompensas por disponibilidad',
    hero_card3_body:
      'Los nodos que permanecen en línea y responden a comprobaciones de estado de forma regular obtienen recompensas adicionales, con parámetros ajustados para hardware cotidiano.',
    overview_title: '1. ¿Qué es BulenCoin?',
    overview_intro:
      'BulenCoin es una criptomoneda con estética de meme, pero con un objetivo de ingeniería serio: demostrar que una red blockchain moderna puede mantenerse con el espectro más amplio posible de dispositivos, desde teléfonos y tabletas hasta portátiles, ordenadores de escritorio y servidores.',
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
    faq_title: '9. Preguntas frecuentes – BulenCoin en la práctica',
    faq_q1: '¿BulenCoin es solo un meme?',
    faq_a1:
      'No. La marca es divertida, pero el protocolo está diseñado como un experimento serio para ejecutar una red cripto completa en dispositivos comunes, combinando ideas de consenso ligero, eficiencia energética y operación de nodos amigable para el usuario.',
    faq_q2: '¿Cómo empiezo a ejecutar un nodo?',
    faq_a2:
      'En testnet y mainnet, descargas BulenNode desde fuentes oficiales, creas un monedero y copia de seguridad de la seed, eliges el modo de nodo (ligero móvil, completo de escritorio, puerta de enlace o solo monedero), configuras los límites de recursos y, opcionalmente, pones BulenCoin en stake o lo delegas. Consulta la guía de despliegue de este repositorio para ver todos los pasos.',
    faq_q3: '¿Cuáles son los principales riesgos?',
    faq_a3:
      'Como en cualquier criptomoneda, no hay beneficios garantizados. Puedes perder acceso a tus fondos si pierdes la seed, y un nodo mal configurado o malicioso puede ser penalizado (slashing). El hardware, la electricidad y los datos también tienen coste. BulenCoin es un proyecto experimental y debe tratarse como tal.',
    footer_note:
      'BulenCoin es un proyecto experimental. Este sitio describe un diseño de red propuesto y no constituye asesoramiento financiero, legal ni fiscal. La operación de nodos o servicios basados en este diseño puede estar regulada en tu jurisdicción; eres responsable de cumplir la legislación local.',
  },
  pl: {
    nav_overview: 'Przegląd',
    nav_nodes: 'Węzły',
    nav_consensus: 'Konsensus',
    nav_economics: 'Ekonomia',
    nav_apps: 'Aplikacje',
    nav_security: 'Bezpieczeństwo',
    nav_docs: 'Dokumentacja',
    nav_roadmap: 'Roadmap',
    choose_language: 'Język',
    hero_title:
      'BulenCoin – memcoin z poważnym sercem inżynierii rozproszonych systemów',
    hero_subtitle:
      'Lekka sieć oparta na Proof of Stake, zaprojektowana tak, aby działała od smartfonów po serwery i nagradzała użytkowników za utrzymywanie prawdziwych węzłów online.',
    hero_cta_docs: 'Dokumentacja i pliki',
    hero_cta_whitesheet: 'Whitesheet (PL, PDF)',
    chip_mobile: 'Gotowe na mobile · desktop · serwer',
    chip_uptime: 'Nagrody za uptime w rdzeniu',
    chip_multilingual: 'Docs: PL / EN / ES',
    hero_highlight_api: 'On-chain payments API z memo do spięcia transakcji z zamówieniem',
    hero_highlight_wallets: 'Challenge/verify dla portfeli MetaMask, WalletConnect, Ledger',
    hero_highlight_tests: 'Full-stack testy w pakiecie (node + explorer + status)',
    hero_card1_title: 'Działa wszędzie',
    hero_card1_body:
      'W jednym łańcuchu współpracują węzły mobilne, desktopowe i serwerowe. Telefony i tablety mogą brać udział bez drastycznego drenażu baterii.',
    hero_card2_title: 'Lekki Proof of Stake',
    hero_card2_body:
      'Bez koparek i farm. Walidatorzy są wybierani na podstawie stake, typu urządzenia i reputacji, a małe komitety podpisują bloki.',
    hero_card3_title: 'Nagrody za uptime',
    hero_card3_body:
      'Węzły, które pozostają online i odpowiadają na health checki, regularnie otrzymują dodatkowe nagrody, z parametrami skalibrowanymi pod typowy sprzęt domowy.',
    overview_title: '1. Czym jest BulenCoin?',
    overview_intro:
      'BulenCoin to kryptowaluta o memowym charakterze, ale z poważnym celem technicznym: pokazaniem, że nowoczesna sieć blockchain może być utrzymywana przez możliwie najszersze spektrum urządzeń – od telefonów i tabletów, przez laptopy i komputery stacjonarne, aż po serwery.',
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
    faq_title: '9. FAQ – BulenCoin w praktyce',
    faq_q1: 'Czy BulenCoin to tylko mem?',
    faq_a1:
      'Nie. Branding jest memowy, ale protokół jest próbą poważnego projektu, który pokazuje, że pełna sieć kryptowalutowa może działać na zwykłych urządzeniach. Łączy on pomysły z lekkiego konsensusu, dbałości o energię i prostego utrzymywania węzła.',
    faq_q2: 'Jak zacząć utrzymywać węzeł?',
    faq_a2:
      'W testnecie i mainnecie pobierasz aplikację BulenNode z oficjalnych źródeł, tworzysz portfel i kopię zapasową seeda, wybierasz tryb węzła (mobilny light, desktopowy pełny, bramkowy lub tylko portfelowy), konfigurujesz limity zasobów oraz – opcjonalnie – stakujesz BulenCoin lub delegujesz go do walidatorów. Pełną instrukcję krok po kroku znajdziesz w przewodniku wdrożeniowym w tym repozytorium.',
    faq_q3: 'Jakie są główne ryzyka?',
    faq_a3:
      'Jak w każdej kryptowalucie, nie ma gwarancji zysku. Możesz utracić środki poprzez zgubienie seed phrase, a źle skonfigurowany lub złośliwy węzeł może zostać ukarany slashowaniem. Dodatkowo występują koszty energii, transferu danych i zużycia sprzętu. BulenCoin jest projektem eksperymentalnym i należy go tak traktować.',
    footer_note:
      'BulenCoin jest projektem eksperymentalnym. Ta strona opisuje proponowany projekt sieci i nie stanowi porady inwestycyjnej, prawnej ani podatkowej. Utrzymywanie węzłów lub usług w oparciu o ten projekt może podlegać regulacjom w Twojej jurysdykcji – za zgodność z prawem odpowiadasz samodzielnie.',
  },
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

  if (translations[preferred]) {
    select.value = preferred;
  }

  applyTranslations(select.value);

  select.addEventListener('change', () => {
    applyTranslations(select.value);
  });
});
