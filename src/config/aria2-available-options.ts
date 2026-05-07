import { basicOptions } from "./aria2/options-basic";
import { httpFtpSFtpOptions } from "./aria2/options-http-ftp-sftp";
import { httpOptions } from "./aria2/options-http";
import { ftpSFtpOptions } from "./aria2/options-ftp-sftp";
import { btOptions } from "./aria2/options-bt";
import { metalinkOptions } from "./aria2/options-metalink";
import { rpcOptions } from "./aria2/options-rpc";
import { advancedOptions } from "./aria2/options-advanced";
import { taskOptions } from "./aria2/options-task";

export const aria2GlobalAvailableOptions = {
    basicOptions,
    httpFtpSFtpOptions,
    httpOptions,
    ftpSFtpOptions,
    btOptions,
    metalinkOptions,
    rpcOptions,
    advancedOptions,
};

export const aria2QuickSettingsAvailableOptions = {
    globalSpeedLimitOptions: [
        "max-overall-download-limit",
        "max-overall-upload-limit",
    ],
};

export const aria2TaskAvailableOptions = {
    taskOptions,
};
