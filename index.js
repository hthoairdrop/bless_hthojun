const fs = require("fs").promises;
const { HttpsProxyAgent } = require("https-proxy-agent");
const readline = require("readline");

const apiBaseUrl = "https://gateway-run.bls.dev/api/v1";
const ipServiceUrl = "https://tight-block-2413.txlabs.workers.dev";

async function loadFetch() {
  const fetch = await import("node-fetch").then((module) => module.default);
  return fetch;
}

async function readProxies() {
  const data = await fs.readFile("proxy.txt", "utf-8");
  const proxies = data
    .trim()
    .split("\n")
    .filter((proxy) => proxy);
  return proxies;
}

async function readNodeAndHardwareIds() {
  const data = await fs.readFile("id.txt", "utf-8");
  const ids = data
    .trim()
    .split("\n")
    .filter((id) => id)
    .map((id) => {
      const [nodeId, hardwareId] = id.split(":");
      return { nodeId, hardwareId };
    });
  return ids;
}

async function readAuthTokens() {
  const data = await fs.readFile("user.txt", "utf-8");
  return data
    .trim()
    .split("\n")
    .filter((token) => token.trim());
}

async function promptUseProxy() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Do you want to use a proxy? (y/n): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function fetchIpAddress(fetch, agent) {
  const response = await fetch(ipServiceUrl, { agent });
  const data = await response.json();
  console.log(`[${new Date().toISOString()}] IP fetch response:`, data);
  return data.ip;
}

async function registerNode(nodeId, hardwareId, ipAddress, proxy, authToken) {
  const fetch = await loadFetch();
  let agent;

  if (proxy) {
    agent = new HttpsProxyAgent(proxy);
  }

  const registerUrl = `${apiBaseUrl}/nodes/${nodeId}`;
  console.log(
    `[${new Date().toISOString()}] Registering node with IP: ${ipAddress}, Hardware ID: ${hardwareId}`
  );
  console.log("check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken.trim()}`,
    },
    body: JSON.stringify({
      ipAddress,
      hardwareId,
    }),
    agent,
  });

  const response = await fetch(registerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken.trim()}`,
      Accept: "*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      Origin: "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
      Priority: "u=1, i",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "X-Extension-Version": "0.1.7",
    },
    body: JSON.stringify({
      ipAddress,
      hardwareId,
      extensionVersion: "0.1.7",
    }),
    agent,
  });

  const data = await response.json();
  console.log(`[${new Date().toISOString()}] Registration response:`, data);
  return data;
}

async function startSession(nodeId, proxy, authToken) {
  const fetch = await loadFetch();
  let agent;

  if (proxy) {
    agent = new HttpsProxyAgent(proxy);
  }

  const startSessionUrl = `${apiBaseUrl}/nodes/${nodeId}/start-session`;
  console.log(
    `[${new Date().toISOString()}] Starting session for node ${nodeId}, it might take a while...`
  );
  const response = await fetch(startSessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken.trim()}`,
      Accept: "*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      Origin: "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
      Priority: "u=1, i",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "X-Extension-Version": "0.1.7",
    },
    agent,
  });

  const data = await response.json();
  console.log(`[${new Date().toISOString()}] Start session response:`, data);
  return data;
}

async function pingNode(nodeId, proxy, ipAddress, authToken) {
    const fetch = await loadFetch();
    const chalk = await import('chalk');
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const pingUrl = `${apiBaseUrl}/nodes/${nodeId}/ping`;
    console.log(`[${new Date().toISOString()}] Pinging node ${nodeId} using proxy ${proxy}`);

    // Số lần thử lại tối đa khi gặp lỗi
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(pingUrl, {
                method: "POST",
    headers: {
      Authorization: `Bearer ${authToken.trim()}`,
      Accept: "*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      Origin: "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
      Priority: "u=1, i",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "X-Extension-Version": "0.1.7",
    },
    agent,
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            const lastPing = data?.pings?.[data?.pings?.length - 1]?.timestamp;
            const logMessage = `[${new Date().toISOString()}] Ping response, ID: ${chalk.default.green(data._id)}, NodeID: ${chalk.default.green(data.nodeId)}, Last Ping: ${chalk.default.yellow(lastPing)}, Proxy: ${proxy}, IP: ${ipAddress}`;
            console.log(logMessage);

            return data; // Trả về kết quả nếu thành công
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error on attempt ${attempt}/${maxRetries}: ${error.message}`);

            // Nếu đã thử đến lần cuối, log lỗi và trả về undefined
            if (attempt === maxRetries) {
                console.error(`[${new Date().toISOString()}] Max retries reached. Unable to ping node ${nodeId}.`);
                return null; // Hoặc một giá trị mặc định khác
            }

            // Đợi trước khi retry (backoff)
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Tăng thời gian chờ theo số lần thử
        }
    }
}

async function displayHeader() {}

async function runAll() {
  try {
    await displayHeader();

    const useProxy = await promptUseProxy();

    const ids = await readNodeAndHardwareIds();
    const proxies = await readProxies();
    const authTokens = await readAuthTokens();

    if (useProxy && proxies.length !== ids.length) {
      throw new Error(
        (await import("chalk")).default.yellow(
          `Number of proxies (${proxies.length}) does not match number of nodeId:hardwareId pairs (${ids.length})`
        )
      );
    }

    for (let tokenIndex = 0; tokenIndex < authTokens.length; tokenIndex++) {
      const authToken = authTokens[tokenIndex];
      const idGroup = ids.slice(tokenIndex * 5, tokenIndex * 5 + 5);

      for (let i = 0; i < idGroup.length; i++) {
        const { nodeId, hardwareId } = idGroup[i];
        const proxy = useProxy ? proxies[i] : null;
        const ipAddress = useProxy
          ? await fetchIpAddress(
              await loadFetch(),
              proxy ? new HttpsProxyAgent(proxy) : null
            )
          : null;

        console.log(
          `[${new Date().toISOString()}] Processing nodeId: ${nodeId}, hardwareId: ${hardwareId}, IP: ${ipAddress}, Token Index: ${tokenIndex}`
        );

        const registrationResponse = await registerNode(
          nodeId,
          hardwareId,
          ipAddress,
          proxy,
          authToken
        );
        console.log(
          `[${new Date().toISOString()}] Node registration completed for nodeId: ${nodeId}. Response:`,
          registrationResponse
        );

        const startSessionResponse = await startSession(
          nodeId,
          proxy,
          authToken
        );
        console.log(
          `[${new Date().toISOString()}] Session started for nodeId: ${nodeId}. Response:`,
          startSessionResponse
        );

        console.log(
          `[${new Date().toISOString()}] Sending initial ping for nodeId: ${nodeId}`
        );
        const initialPingResponse = await pingNode(
          nodeId,
          proxy,
          ipAddress,
          authToken
        );

        setInterval(async () => {
          console.log(
            `[${new Date().toISOString()}] Sending ping for nodeId: ${nodeId}`
          );
          const pingResponse = await pingNode(
            nodeId,
            proxy,
            ipAddress,
            authToken
          );
        }, 60000);
      }
    }
  } catch (error) {
    const chalk = await import("chalk");
    console.error(
      chalk.default.yellow(
        `[${new Date().toISOString()}] An error occurred: ${error.message}`
      )
    );
  }
}

runAll();
