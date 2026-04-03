package com.structure.admin;

import com.structure.common.AdminAuthorization;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminAuthorization adminAuthorization;

    public AdminController(AdminAuthorization adminAuthorization) {
        this.adminAuthorization = adminAuthorization;
    }

    @PostMapping("/login")
    public AdminLoginResponse login(@Valid @RequestBody AdminLoginRequest request) {
        String token = adminAuthorization.login(request.username(), request.password());
        return new AdminLoginResponse(token);
    }
}
