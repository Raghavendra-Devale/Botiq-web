package com.dfive.botiq.filters;

import com.dfive.botiq.entities.UserPrincipal;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.repositories.OrgUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private OrgUserRepository orgUserRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain)
            throws ServletException, IOException {

        System.out.println("FIREBASE FILTER HIT");
        System.out.println(SecurityContextHolder.getContext().getAuthentication());

        // Session already authenticated
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            chain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {

            String token = authHeader.substring(7);

            try {

                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);

                String firebaseUid = decodedToken.getUid();

                OrgUser orgUser = orgUserRepository.findByfirebaseId(firebaseUid).orElse(null);
                UserPrincipal principal;

                if (orgUser != null) {
                    principal = UserPrincipal.builder()
                            .userId(orgUser.getUserId() != null ? orgUser.getUserId().longValue() : null)
                            .firebaseUid(firebaseUid)
                            .email(orgUser.getEmailId())
                            .orgId(orgUser.getOrgId())
                            .orgName(orgUser.getOrgName())
                            .role(orgUser.getUserRole())
                            .build();
                } else {
                    principal = UserPrincipal.builder()
                            .firebaseUid(firebaseUid)
                            .email(decodedToken.getEmail())
                            .build();
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                Collections.emptyList()
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContext context = SecurityContextHolder.createEmptyContext();

                context.setAuthentication(authentication);

                SecurityContextHolder.setContext(context);

            } catch (Exception e) {

                SecurityContextHolder.clearContext();

                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid Token"
                );

                return;
            }
        }

        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request) {

        return request.getRequestURI()
                .startsWith("/web/auth");
    }
}