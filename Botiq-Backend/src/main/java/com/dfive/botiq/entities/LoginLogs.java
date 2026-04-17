package com.dfive.botiq.entities;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "login_logs")
public class LoginLogs {

      @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("log_id")
    private Integer logId;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("login_time")
    private String loginTime;

    @JsonProperty("device_info")
    private String deviceInfo;

    @JsonProperty("app_version")
    private String appVersion;

    @JsonProperty("ip_address")
    private String ipAddress;

    @JsonProperty("error_message")
    private String errorMessage;

    @JsonProperty("updated_time")
    private String updatedTime;

    @JsonProperty("sync_status")
    private String syncStatus;
    
    public Integer getLogId() {
        return logId;
    }
    public void setLogId(Integer logId) {
        this.logId = logId;
    }
    public String getUserId() {
        return userId;
    }
    public void setUserId(String userId) {
        this.userId = userId;
    }
    public String getLoginTime() {
        return loginTime;
    }
    public void setLoginTime(String loginTime) {
        this.loginTime = loginTime;
    }
    public String getDeviceInfo() {
        return deviceInfo;
    }
    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }
    public String getAppVersion() {
        return appVersion;
    }
    public void setAppVersion(String appVersion) {
        this.appVersion = appVersion;
    }
    public String getIpAddress() {
        return ipAddress;
    }
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
    public String getErrorMessage() {
        return errorMessage;
    }
    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
    public String getUpdatedTime() {
        return updatedTime;
    }
    public void setUpdatedTime(String updatedTime) {
        this.updatedTime = updatedTime;
    }
    public String getSyncStatus() {
        return syncStatus;
    }
    public void setSyncStatus(String syncStatus) {
        this.syncStatus = syncStatus;
    }



}
