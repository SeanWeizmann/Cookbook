package com.structure.recipe;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

public record CreateRecipeRequest(
        @NotBlank(message = "Recipe title is required")
        @Size(max = 180, message = "Recipe title cannot exceed 180 characters")
        String title,

        @NotBlank(message = "Ingredients are required")
        String ingredients,

        @NotBlank(message = "Instructions are required")
        String instructions,

        @Size(max = 1200, message = "Image URL cannot exceed 1200 characters")
        @URL
        String imageUrl,

        @NotNull(message = "Category is required")
        Long categoryId
) {
}
