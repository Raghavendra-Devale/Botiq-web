package com.dfive.botiq.util;


import java.lang.reflect.Field;

import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.Set;

public class FieldUpdater {

    public static void updateFields(Object existing, Object newObject, JsonNode node) throws IllegalAccessException {
        // Get expected fields from DTO class
        Set<String> expectedFields = new HashSet<>();
        for (Field field : newObject.getClass().getDeclaredFields()) {
            expectedFields.add(field.getName());
        }

        // Get actual fields from JSON request
        Set<String> actualFields = new HashSet<>();
        node.fieldNames().forEachRemaining(actualFields::add);

        // Check for unknown fields
        actualFields.removeAll(expectedFields);
        if (!actualFields.isEmpty()) {
            throw new IllegalArgumentException("Invalid fields found: " + actualFields);
        }

        // Update only existing fields
        for (Field field : newObject.getClass().getDeclaredFields()) {
            field.setAccessible(true);
            String fieldName = field.getName();
            if (node.has(fieldName) && !node.get(fieldName).isNull()) {
                Object newValue = field.get(newObject);
                field.set(existing, newValue);
            }
        }
    }
}
