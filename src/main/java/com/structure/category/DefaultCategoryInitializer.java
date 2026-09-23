package com.structure.category;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DefaultCategoryInitializer implements CommandLineRunner {

    private static final List<String> DEFAULT_CATEGORIES = List.of("Sweet", "Salty", "Children meals", "Drink");

    private final CategoryRepository categoryRepository;

    public DefaultCategoryInitializer(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public void run(String... args) {
        DEFAULT_CATEGORIES.stream()
                .filter(name -> !categoryRepository.existsByNameIgnoreCase(name))
                .forEach(name -> {
                    Category category = new Category();
                    category.setName(name);
                    categoryRepository.save(category);
                });
    }
}
