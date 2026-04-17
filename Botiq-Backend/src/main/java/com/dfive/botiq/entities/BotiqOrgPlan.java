package com.dfive.botiq.entities;
import java.util.Date;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "botiq_org_plan")
public class BotiqOrgPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Integer planId;

    @Column(name = "org_id")
    private Integer orgId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "plan_type")
    private String planType;

    @Column(name = "plan_start_date")
    private Date planStartDate;

    @Column(name = "plan_end_date")
    private Date planEndDate;

    @Column(name = "amount_paid")
    private Integer amountPaid;

    @Column(name = "payment_id")
    private Integer paymentId;

    @Column(name = "payment_txn_reference")
    private String paymentTxnReference;

    @Column(name = "amount_before_gst")
    private Integer amountBeforeGst;

    @Column(name = "gst_amount")
    private Integer gstAmount;

    public Integer getPlanId() {
        return planId;
    }

    public void setPlanId(Integer planId) {
        this.planId = planId;
    }

    public Integer getOrgId() {
        return orgId;
    }

    public void setOrgId(Integer orgId) {
        this.orgId = orgId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getPlanType() {
        return planType;
    }

    public void setPlanType(String planType) {
        this.planType = planType;
    }

    public Date getPlanStartDate() {
        return planStartDate;
    }

    public void setPlanStartDate(Date planStartDate) {
        this.planStartDate = planStartDate;
    }

    public Date getPlanEndDate() {
        return planEndDate;
    }

    public void setPlanEndDate(Date planEndDate) {
        this.planEndDate = planEndDate;
    }

    public Integer getAmountPaid() {
        return amountPaid;
    }

    public void setAmountPaid(Integer amountPaid) {
        this.amountPaid = amountPaid;
    }

    public Integer getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Integer paymentId) {
        this.paymentId = paymentId;
    }

    public String getPaymentTxnReference() {
        return paymentTxnReference;
    }

    public void setPaymentTxnReference(String paymentTxnReference) {
        this.paymentTxnReference = paymentTxnReference;
    }

    public Integer getAmountBeforeGst() {
        return amountBeforeGst;
    }

    public void setAmountBeforeGst(Integer amountBeforeGst) {
        this.amountBeforeGst = amountBeforeGst;
    }

    public Integer getGstAmount() {
        return gstAmount;
    }

    public void setGstAmount(Integer gstAmount) {
        this.gstAmount = gstAmount;
    }







    
}