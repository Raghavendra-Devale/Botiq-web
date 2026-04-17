package com.dfive.botiq.entities;

import java.sql.Timestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "botiq_partner")
public class BotiqPartner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long partnerId;

    private Long orgId;
    private String partnerName;
    private String partnerContact;
    private String partnerAddress;
    private Integer partnerCategoryId;
    private String partnerCategory;
    private String notes;
    private Boolean enabled;
    private Boolean deleted;
    private Timestamp updatedDate;
    private String updatedBy;
    private Timestamp lastSyncedTime;
    
    public Long getPartnerId() {
        return partnerId;
    }
    public void setPartnerId(Long partnerId) {
        this.partnerId = partnerId;
    }
    public Long getOrgId() {
        return orgId;
    }
    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }
    public String getPartnerName() {
        return partnerName;
    }
    public void setPartnerName(String partnerName) {
        this.partnerName = partnerName;
    }
    public String getPartnerContact() {
        return partnerContact;
    }
    public void setPartnerContact(String partnerContact) {
        this.partnerContact = partnerContact;
    }
    public String getPartnerAddress() {
        return partnerAddress;
    }
    public void setPartnerAddress(String partnerAddress) {
        this.partnerAddress = partnerAddress;
    }
    public Integer getPartnerCategoryId() {
        return partnerCategoryId;
    }
    public void setPartnerCategoryId(Integer partnerCategoryId) {
        this.partnerCategoryId = partnerCategoryId;
    }
    public String getPartnerCategory() {
        return partnerCategory;
    }
    public void setPartnerCategory(String partnerCategory) {
        this.partnerCategory = partnerCategory;
    }
    public String getNotes() {
        return notes;
    }
    public void setNotes(String notes) {
        this.notes = notes;
    }
    public Boolean getEnabled() {
        return enabled;
    }
    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
    public Boolean getDeleted() {
        return deleted;
    }
    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
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
