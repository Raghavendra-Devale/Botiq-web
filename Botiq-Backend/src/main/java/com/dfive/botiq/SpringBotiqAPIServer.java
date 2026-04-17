package com.dfive.botiq;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.dfive.botiq"})
public class SpringBotiqAPIServer extends SpringBootServletInitializer{


	@Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(SpringBotiqAPIServer.class);
    }
	public static void main(String[] args) {
		SpringApplication.run(SpringBotiqAPIServer.class, args);
	}

}
