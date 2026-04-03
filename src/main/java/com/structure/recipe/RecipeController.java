package com.structure.recipe;

import com.structure.category.Category;
import com.structure.category.CategoryRepository;
import com.structure.common.AdminAuthorization;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeRepository recipeRepository;
    private final CategoryRepository categoryRepository;
    private final AdminAuthorization adminAuthorization;

    public RecipeController(RecipeRepository recipeRepository, CategoryRepository categoryRepository,
                            AdminAuthorization adminAuthorization) {

        this.recipeRepository = recipeRepository;
        this.categoryRepository = categoryRepository;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping
    public List<RecipeResponse> getRecipes(@RequestParam(required = false) Long categoryId) {

        List<Recipe> recipes = categoryId == null ? recipeRepository.findAllByOrderByCreatedAtDesc() :
                                                    recipeRepository.findByCategoryIdOrderByCreatedAtDesc(categoryId);
        return recipes.stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public RecipeResponse getRecipeById(@PathVariable Long id) {
        Recipe recipe = recipeRepository
                .findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found"));

        return toResponse(recipe);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecipeResponse createRecipe(@RequestHeader(name = "X-Admin-Token", required = false) String adminToken,
                                       @Valid @RequestBody CreateRecipeRequest request) {

        adminAuthorization.requireAdmin(adminToken);

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        Recipe recipe = new Recipe();
        recipe.setTitle(request.title().trim());
        recipe.setIngredients(request.ingredients().trim());
        recipe.setInstructions(request.instructions().trim());
        recipe.setImageUrl(isBlank(request.imageUrl()) ? null : request.imageUrl().trim());
        recipe.setCategory(category);
        recipe.setCreatedAt(LocalDateTime.now());

        Recipe saved = recipeRepository.save(recipe);
        return toResponse(saved);
    }

    @PutMapping("/{id}")
    public RecipeResponse updateRecipe(@RequestHeader(name = "X-Admin-Token", required = false) String adminToken,
                                       @PathVariable Long id,
                                       @Valid @RequestBody UpdateRecipeRequest request) {

        adminAuthorization.requireAdmin(adminToken);

        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found"));

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        recipe.setTitle(request.title().trim());
        recipe.setIngredients(request.ingredients().trim());
        recipe.setInstructions(request.instructions().trim());
        recipe.setImageUrl(isBlank(request.imageUrl()) ? null : request.imageUrl().trim());
        recipe.setCategory(category);

        Recipe saved = recipeRepository.save(recipe);
        return toResponse(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecipe(@RequestHeader(name = "X-Admin-Token", required = false) String adminToken,
                             @PathVariable Long id) {

        adminAuthorization.requireAdmin(adminToken);

        if (!recipeRepository.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found");

        recipeRepository.deleteById(id);
    }

    private RecipeResponse toResponse(Recipe recipe) {

        return new RecipeResponse(
                recipe.getId(),
                recipe.getTitle(),
                recipe.getIngredients(),
                recipe.getInstructions(),
                recipe.getImageUrl(),
                recipe.getCategory().getId(),
                recipe.getCategory().getName(),
                recipe.getCreatedAt());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
