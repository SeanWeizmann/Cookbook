package com.structure.category;

import com.structure.common.AdminAuthorization;
import com.structure.recipe.RecipeRepository;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final RecipeRepository recipeRepository;
    private final AdminAuthorization adminAuthorization;

    public CategoryController(CategoryRepository categoryRepository, RecipeRepository recipeRepository,
                              AdminAuthorization adminAuthorization) {

        this.categoryRepository = categoryRepository;
        this.recipeRepository = recipeRepository;
        this.adminAuthorization = adminAuthorization;
    }

    @GetMapping
    public List<CategoryResponse> getCategories() {

        return categoryRepository.findAll().stream().map(category -> new CategoryResponse(category.getId(),
               category.getName(),recipeRepository.countByCategoryId(category.getId()))).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@RequestHeader(name = "X-Admin-Token", required = false) String adminToken,
                                           @Valid @RequestBody CreateCategoryRequest request) {

        adminAuthorization.requireAdmin(adminToken);

        String normalizedName = request.name().trim();

        if (categoryRepository.existsByNameIgnoreCase(normalizedName))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category name already exists");

        Category category = new Category();
        category.setName(normalizedName);

        Category saved = categoryRepository.save(category);
        return new CategoryResponse(saved.getId(), saved.getName(), 0);
    }

    @PutMapping("/{id}")
    public CategoryResponse updateCategory(@RequestHeader(name = "X-Admin-Token", required = false) String adminToken,
                                           @PathVariable Long id,
                                           @Valid @RequestBody UpdateCategoryRequest request) {

        adminAuthorization.requireAdmin(adminToken);

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        String normalizedName = request.name().trim();
        categoryRepository.findByNameIgnoreCase(normalizedName)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Category name already exists");
                });

        category.setName(normalizedName);
        Category saved = categoryRepository.save(category);
        long recipeCount = recipeRepository.countByCategoryId(saved.getId());
        return new CategoryResponse(saved.getId(), saved.getName(), recipeCount);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@RequestHeader(name = "X-Admin-Token", required = false) String adminToken,
                               @PathVariable Long id) {

        adminAuthorization.requireAdmin(adminToken);

        if (!categoryRepository.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");

        if (recipeRepository.countByCategoryId(id) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category has recipes. Delete recipes first");

        categoryRepository.deleteById(id);
    }
}
