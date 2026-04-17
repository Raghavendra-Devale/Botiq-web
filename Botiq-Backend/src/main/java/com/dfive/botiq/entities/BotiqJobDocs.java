package com.dfive.botiq.entities;

import java.sql.Timestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "botiq_job_docs")
public class BotiqJobDocs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long jobDocId;

    private Long jobId;
    private Long orderId;
    private Integer detailsId;
    private Integer detailsType;
    private String detailsData;
    private Boolean sharedM;
    private Boolean sharedPt;
    private Boolean sharedMt;
    private String note;
     private Timestamp lastSyncedTime;
     
    public Long getJobDocId() {
        return jobDocId;
    }
    public void setJobDocId(Long jobDocId) {
        this.jobDocId = jobDocId;
    }
    public Long getJobId() {
        return jobId;
    }
    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }
    public Long getOrderId() {
        return orderId;
    }
    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
    public Integer getDetailsId() {
        return detailsId;
    }
    public void setDetailsId(Integer detailsId) {
        this.detailsId = detailsId;
    }
    public Integer getDetailsType() {
        return detailsType;
    }
    public void setDetailsType(Integer detailsType) {
        this.detailsType = detailsType;
    }
    public String getDetailsData() {
        return detailsData;
    }
    public void setDetailsData(String detailsData) {
        this.detailsData = detailsData;
    }
    public Boolean getSharedM() {
        return sharedM;
    }
    public void setSharedM(Boolean sharedM) {
        this.sharedM = sharedM;
    }
    public Boolean getSharedPt() {
        return sharedPt;
    }
    public void setSharedPt(Boolean sharedPt) {
        this.sharedPt = sharedPt;
    }
    public Boolean getSharedMt() {
        return sharedMt;
    }
    public void setSharedMt(Boolean sharedMt) {
        this.sharedMt = sharedMt;
    }
    public String getNote() {
        return note;
    }
    public void setNote(String note) {
        this.note = note;
    }
    public Timestamp getLastSyncedTime() {
        return lastSyncedTime;
    }
    public void setLastSyncedTime(Timestamp lastSyncedTime) {
        this.lastSyncedTime = lastSyncedTime;
    }



    
}
