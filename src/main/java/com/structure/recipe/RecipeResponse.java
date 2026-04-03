package com.structure.recipe;

import java.time.LocalDateTime;

public record RecipeResponse(
        Long id,
        String title,
        String ingredients,
        String instructions,
        String imageUrl,
        Long categoryId,
        String categoryName,
        LocalDateTime createdAt
) {
}
