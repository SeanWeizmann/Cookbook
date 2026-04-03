package com.structure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CookbookApplicationTests {

    private static final String ADMIN_TOKEN_HEADER = "X-Admin-Token";
    private static final String ADMIN_TOKEN_VALUE = "change-me-admin-token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createCategoryAndRecipeAndFilterByCategory() throws Exception {
        Map<String, Object> categoryPayload = new HashMap<>();
        categoryPayload.put("name", "Desserts");

        MvcResult categoryResult = mockMvc.perform(adminPost("/api/categories", categoryPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Desserts"))
                .andReturn();

        JsonNode categoryBody = objectMapper.readTree(categoryResult.getResponse().getContentAsString());
        long categoryId = categoryBody.get("id").asLong();

        Map<String, Object> recipePayload = new HashMap<>();
        recipePayload.put("title", "Chocolate Cake");
        recipePayload.put("ingredients", "Flour\nCocoa\nEggs");
        recipePayload.put("instructions", "Mix\nBake");
        recipePayload.put("imageUrl", "https://example.com/cake.jpg");
        recipePayload.put("categoryId", categoryId);

        mockMvc.perform(adminPost("/api/recipes", recipePayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Chocolate Cake"))
                .andExpect(jsonPath("$.categoryName").value("Desserts"));

        mockMvc.perform(get("/api/recipes").param("categoryId", String.valueOf(categoryId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Chocolate Cake"));
    }

    @Test
    void createCategoryRequiresAdmin() throws Exception {
        Map<String, Object> categoryPayload = new HashMap<>();
        categoryPayload.put("name", "Private");

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(categoryPayload)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Admin access required"));
    }

    @Test
    void duplicateCategoryReturnsConflict() throws Exception {
        Map<String, Object> categoryPayload = new HashMap<>();
        categoryPayload.put("name", "Lunch");

        mockMvc.perform(adminPost("/api/categories", categoryPayload))
                .andExpect(status().isCreated());

        mockMvc.perform(adminPost("/api/categories", categoryPayload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Category name already exists"));
    }

    @Test
    void deleteRecipeAndCategoryRules() throws Exception {
        Map<String, Object> categoryPayload = new HashMap<>();
        categoryPayload.put("name", "Breakfast");

        MvcResult categoryResult = mockMvc.perform(adminPost("/api/categories", categoryPayload))
                .andExpect(status().isCreated())
                .andReturn();

        long categoryId = objectMapper.readTree(categoryResult.getResponse().getContentAsString()).get("id").asLong();

        Map<String, Object> recipePayload = new HashMap<>();
        recipePayload.put("title", "Pancakes");
        recipePayload.put("ingredients", "Flour\nMilk\nEggs");
        recipePayload.put("instructions", "Mix\nCook");
        recipePayload.put("imageUrl", "");
        recipePayload.put("categoryId", categoryId);

        MvcResult recipeResult = mockMvc.perform(adminPost("/api/recipes", recipePayload))
                .andExpect(status().isCreated())
                .andReturn();

        long recipeId = objectMapper.readTree(recipeResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/categories/{id}", categoryId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Category has recipes. Delete recipes first"));

        mockMvc.perform(delete("/api/recipes/{id}", recipeId))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/categories/{id}", categoryId))
                .andExpect(status().isNoContent());
    }

    private MockHttpServletRequestBuilder adminPost(String url, Map<String, Object> payload) throws Exception {
        return post(url)
                .header(ADMIN_TOKEN_HEADER, ADMIN_TOKEN_VALUE)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload));
    }
}
