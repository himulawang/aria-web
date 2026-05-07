export const aria2AllOptions: Record<string, any> = {
    "dir": { name: "Dir", type: "string", description: ["The directory to store the downloaded file."] },
    "max-connection-per-server": { name: "Max Connection", type: "integer", description: ["The maximum number of connections to one server for each download."] },
    "split": { name: "Split", type: "integer", description: ["Download a file using N connections."] },
    "min-split-size": { name: "Min Split Size", type: "string", description: ["Upload progress of the download in bytes."] },
    "max-overall-download-limit": { name: "Max Overall Download Limit", type: "integer", description: ["Overall download speed limit in bytes/sec."] },
    "max-overall-upload-limit": { name: "Max Overall Upload Limit", type: "integer", description: ["Overall upload speed limit in bytes/sec."] },
    "enable-peer-exchange": { name: "Enable Peer Exchange", type: "boolean", description: ["Enable Peer Exchange (PEX)."] },
};

export const aria2GlobalAvailableOptions: Record<string, string[]> = {
    "basic": ["dir", "max-connection-per-server", "split", "min-split-size"],
    "advanced": ["max-overall-download-limit", "max-overall-upload-limit", "enable-peer-exchange"],
};
