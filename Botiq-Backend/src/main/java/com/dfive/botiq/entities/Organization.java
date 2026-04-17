package com.dfive.botiq.entities;

import java.sql.Date;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "organization")
public class Organization {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orgId;
    private String orgName;
    private String ownerName;
    private String mobileNumber;
    private Boolean enabled;
    private Boolean deleted;
    private String orgAddress;
    private String planType;
    private LocalDate planStartDate;
    private LocalDate planEndDate;
    private Integer planId;
    private Integer planTypeId;
    private Integer monthlyOrderLimit;
    private String referralCode;
    private String referredBy;

    
  
 
    public String getOrgName() {
        return orgName;
    }
    public void setOrgName(String orgName) {
        this.orgName = orgName;
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
    public String getOrgAddress() {
        return orgAddress;
    }
    public void setOrgAddress(String orgAddress) {
        this.orgAddress = orgAddress;
    }
    public String getMobileNumber() {
        return mobileNumber;
    }
    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getOwnerName() {
        return ownerName;
    }
    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }
    public Integer getOrgId() {
        return orgId;
    }
    public void setOrgId(Integer orgId) {
        this.orgId = orgId;
    }
    public String getPlanType() {
        return planType;
    }
    public void setPlanType(String planType) {
        this.planType = planType;
    }

    
    public LocalDate getPlanStartDate() {
        return planStartDate;
    }
    public void setPlanStartDate(LocalDate planStartDate) {
        this.planStartDate = planStartDate;
    }
    public LocalDate getPlanEndDate() {
        return planEndDate;
    }
    public void setPlanEndDate(LocalDate planEndDate) {
        this.planEndDate = planEndDate;
    }
    public Integer getPlanId() {
        return planId;
    }
    public void setPlanId(Integer planId) {
        this.planId = planId;
    }
    public Integer getPlanTypeId() {
        return planTypeId;
    }
    public void setPlanTypeId(Integer planTypeId) {
        this.planTypeId = planTypeId;
    }
    public Integer getMonthlyOrderLimit() {
        return monthlyOrderLimit;
    }
    public void setMonthlyOrderLimit(Integer monthlyOrderLimit) {
        this.monthlyOrderLimit = monthlyOrderLimit;
    }
    public String getReferralCode() {
        return referralCode;
    }
    public void setReferralCode(String referralCode) {
        this.referralCode = referralCode;
    }
    public String getReferredBy() {
        return referredBy;
    }
    public void setReferredBy(String referredBy) {
        this.referredBy = referredBy;
    }


    
}