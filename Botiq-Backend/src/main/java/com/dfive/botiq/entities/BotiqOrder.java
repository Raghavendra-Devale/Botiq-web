package com.dfive.botiq.entities;

import java.sql.Timestamp;
import java.util.Date;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "botiq_order")
public class BotiqOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderId;

    private Long orgId;
    private Long customerId;
    private String orderDetails;
    private Integer orderStatus;
    private Integer paymentStatus;
    private Integer orderAmount;
    private Integer advanceAmount;
    private Integer dueAmount;
    private Date orderDate;
    private Date dueDate;
    private Boolean hasJobOrder;
    private Integer orderPriority;
    private Timestamp createdDate;
    private Timestamp updatedDate;
    private String updatedBy;
    private Timestamp lastSyncedTime;
    
    public Long getOrderId() {
        return orderId;
    }
    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
    public Long getOrgId() {
        return orgId;
    }
    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }
    public Long getCustomerId() {
        return customerId;
    }
    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }
    public String getOrderDetails() {
        return orderDetails;
    }
    public void setOrderDetails(String orderDetails) {
        this.orderDetails = orderDetails;
    }
    public Integer getOrderStatus() {
        return orderStatus;
    }
    public void setOrderStatus(Integer orderStatus) {
        this.orderStatus = orderStatus;
    }
    public Integer getPaymentStatus() {
        return paymentStatus;
    }
    public void setPaymentStatus(Integer paymentStatus) {
        this.paymentStatus = paymentStatus;
    }
    public Integer getOrderAmount() {
        return orderAmount;
    }
    public void setOrderAmount(Integer orderAmount) {
        this.orderAmount = orderAmount;
    }
    public Integer getAdvanceAmount() {
        return advanceAmount;
    }
    public void setAdvanceAmount(Integer advanceAmount) {
        this.advanceAmount = advanceAmount;
    }
    public Integer getDueAmount() {
        return dueAmount;
    }
    public void setDueAmount(Integer dueAmount) {
        this.dueAmount = dueAmount;
    }
    public Date getOrderDate() {
        return orderDate;
    }
    public void setOrderDate(Date orderDate) {
        this.orderDate = orderDate;
    }
    public Date getDueDate() {
        return dueDate;
    }
    public void setDueDate(Date dueDate) {
        this.dueDate = dueDate;
    }
    public Boolean getHasJobOrder() {
        return hasJobOrder;
    }
    public void setHasJobOrder(Boolean hasJobOrder) {
        this.hasJobOrder = hasJobOrder;
    }
    public Integer getOrderPriority() {
        return orderPriority;
    }
    public void setOrderPriority(Integer orderPriority) {
        this.orderPriority = orderPriority;
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
