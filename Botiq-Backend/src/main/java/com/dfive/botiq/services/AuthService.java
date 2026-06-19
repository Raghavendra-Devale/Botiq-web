package com.dfive.botiq.services;

import com.dfive.botiq.constants.SessionConstants;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.repositories.OrgUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final OrgUserRepository orgUserRepository;

    public UserPrincipal buildPrincipal(
            OrgUser orgUser
    ) {

        return UserPrincipal.builder()
                .userId(
                        orgUser.getUserId() != null
                                ? orgUser.getUserId().longValue()
                                : null
                )
                .firebaseUid(
                        orgUser.getFirebaseId()
                )
                .email(
                        orgUser.getEmailId()
                )
                .orgId(
                        orgUser.getOrgId()
                )
                .orgName(
                        orgUser.getOrgName()
                )
                .build();
    }

    public void createUserSession(
            HttpServletRequest request,
            UserPrincipal principal
    ) {

        HttpSession session =
                request.getSession(true);

        session.setAttribute(
                SessionConstants.USER_PRINCIPAL,
                principal
        );

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        Collections.emptyList()
                );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);

        SecurityContextHolder.setContext(context);

        session.setAttribute(
                HttpSessionSecurityContextRepository
                        .SPRING_SECURITY_CONTEXT_KEY,
                context
        );
    }
}