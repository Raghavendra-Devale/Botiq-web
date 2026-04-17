package com.dfive.botiq.entities;

import java.sql.Timestamp;
import java.util.Date;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "botiq_job_order")
public class BotiqJobOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long jobId;

    private Long orgId;
    private Long orderId;
    private Long customerId;
    private Long partnerId;
    private String jobOrderDetails;
    private Date jobDueDate;
    private Integer jobPriority;
    private Timestamp createdDate;
    private Timestamp updatedDate;
    private String updatedBy;
    private Timestamp lastSyncedTime ;
    public Long getJobId() {
        return jobId;
    }
    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }
    public Long getOrgId() {
        return orgId;
    }
    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }
    public Long getOrderId() {
        return orderId;
    }
    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
    public Long getCustomerId() {
        return customerId;
    }
    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }
    public Long getPartnerId() {
        return partnerId;
    }
    public void setPartnerId(Long partnerId) {
        this.partnerId = partnerId;
    }
    public String getJobOrderDetails() {
        return jobOrderDetails;
    }
    public void setJobOrderDetails(String jobOrderDetails) {
        this.jobOrderDetails = jobOrderDetails;
    }
    public Date getJobDueDate() {
        return jobDueDate;
    }
    public void setJobDueDate(Date jobDueDate) {
        this.jobDueDate = jobDueDate;
    }
    public Integer getJobPriority() {
        return jobPriority;
    }
    public void setJobPriority(Integer jobPriority) {
        this.jobPriority = jobPriority;
    }
    public Timestamp getCreatedDate() {
        return createdDate;
    }
    public void setCreatedDate(Timestamp createdDate) {
        this.createdDate = createdDate;
    }
    public Timestamp getUpdatedDate() {
        return updatedDate;
    }
    public void setUpdatedDate(Timestamp updatedDate) {
        this.updatedDate = updatedDate;
    }
    public String getUpdatedBy() {
        return updatedBy;
    }
    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
    public Timestamp getLastSyncedTime() {
        return lastSyncedTime;
    }
    public void setLastSyncedTime(Timestamp lastSyncedTime) {
        this.lastSyncedTime = lastSyncedTime;
    }




    
}