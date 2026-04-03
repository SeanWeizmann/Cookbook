package com.structure.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminAuthorization {

    private final String adminToken;
    private final String adminUsername;
    private final String adminPassword;

    public AdminAuthorization(@Value("${app.admin.token}") String adminToken,
                              @Value("${app.admin.username}") String adminUsername,
                              @Value("${app.admin.password}") String adminPassword) {
        this.adminToken = adminToken;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    public void requireAdmin(String providedToken) {
        if (providedToken == null || !adminToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    public String login(String username, String password) {
        if (username == null || password == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin credentials");
        }

        if (!adminUsername.equals(username) || !adminPassword.equals(password)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin credentials");
        }

        return adminToken;
    }
}
