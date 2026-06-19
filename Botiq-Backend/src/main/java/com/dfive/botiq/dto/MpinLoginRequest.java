package com.dfive.botiq.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MpinLoginRequest {

    @NotBlank
    @Pattern(
            regexp = "\\d{6}",
            message = "MPIN must be 6 digits"
    )
    private String mpin;
}