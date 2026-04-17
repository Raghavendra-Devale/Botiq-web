package com.dfive.botiq.entities;

import java.sql.Timestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "botiq_order_docs")
public class BotiqOrderDocs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long docId;

    private Long orderId;
    private Integer detailsType;
    private String detailsData;
    private Timestamp updatedDate;
    private Timestamp lastSyncedTime;
    
    public Long getDocId() {
        return docId;
    }
    public void setDocId(Long docId) {
        this.docId = docId;
    }
    public Long getOrderId() {
        return orderId;
    }
    public void setOrderId(Long orderId) {
        this.orderId = orderId;
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
    public Timestamp getUpdatedDate() {
        return updatedDate;
    }
    public void setUpdatedDate(Timestamp updatedDate) {
        this.updatedDate = updatedDate;
    }
    public Timestamp getLastSyncedTime() {
        return lastSyncedTime;
    }
    public void setLastSyncedTime(Timestamp lastSyncedTime) {
        this.lastSyncedTime = lastSyncedTime;
    }


    
}