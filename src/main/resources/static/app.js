const categoriesEl = document.getElementById("categories");
const recipesEl = document.getElementById("recipes");
const recipeViewEl = document.getElementById("recipe-view");
const workspaceTitleEl = document.getElementById("workspace-title");
const workspaceSubtitleEl = document.getElementById("workspace-subtitle");

const categorySelect = document.getElementById("recipe-category");
const statusEl = document.getElementById("status");
const emptyStateEl = document.getElementById("empty-state");

const categoryForm = document.getElementById("category-form");
const recipeForm = document.getElementById("recipe-form");
const adminLoginForm = document.getElementById("admin-login-form");
const categoryFormTitleEl = document.getElementById("category-form-title");
const categoryFormSubmitEl = document.getElementById("category-form-submit");
const recipeFormTitleEl = document.getElementById("recipe-form-title");
const recipeFormSubmitEl = document.getElementById("recipe-form-submit");
const editorSectionEl = document.getElementById("editor-section");
const openCategoryFormBtn = document.getElementById("open-category-form");
const openRecipeFormBtn = document.getElementById("open-recipe-form");
const openAdminLoginBtn = document.getElementById("open-admin-login");
const adminLogoutBtn = document.getElementById("admin-logout");
const startScreenEl = document.getElementById("start-screen");
const togglePasswordEl = document.getElementById("toggle-password");
const adminPasswordInput = document.getElementById("admin-password");
const closeEditorButtons = document.querySelectorAll("[data-close-editor]");

let selectedCategoryId = null;
let selectedRecipeId = null;
let currentCategories = [];
let currentRecipes = [];
let editingCategoryId = null;
let editingRecipeId = null;

function hasAdminToken() {
    const adminToken = window.localStorage.getItem("cookbookAdminToken");
    return Boolean(adminToken && adminToken.trim());
}

function unlockApp() {
    if (!document.body.classList.contains("app-locked")) {
        return;
    }
    document.body.classList.remove("app-locked");
}

document.addEventListener("keydown", unlockApp, { once: true });
document.addEventListener("click", unlockApp, { once: true });
document.addEventListener("touchstart", unlockApp, { once: true });

startScreenEl.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        unlockApp();
    }
});
startScreenEl.addEventListener("click", unlockApp);

if (togglePasswordEl && adminPasswordInput) {
    togglePasswordEl.addEventListener("change", () => {
        adminPasswordInput.type = togglePasswordEl.checked ? "text" : "password";
    });
}

function buildHeaders(extraHeaders = {}) {
    const adminToken = window.localStorage.getItem("cookbookAdminToken");
    const headers = {
        "Content-Type": "application/json",
        ...extraHeaders
    };

    if (adminToken) {
        headers["X-Admin-Token"] = adminToken;
    }

    return headers;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: buildHeaders(options.headers || {})
    });

    if (!response.ok) {
        let errorMessage = "Request failed";
        try {
            const body = await response.json();
            errorMessage = body.message || errorMessage;
            if (Array.isArray(body.details) && body.details.length) {
                errorMessage += `: ${body.details.join(", ")}`;
            }
        } catch (_) {
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function setStatus(message) {
    statusEl.textContent = message;
}

function transitionOutIn(element, renderFn) {
    if (!element) {
        renderFn();
        return;
    }

    element.classList.add("is-transitioning");
    window.setTimeout(() => {
        renderFn();
        requestAnimationFrame(() => element.classList.remove("is-transitioning"));
    }, 120);
}

function setRecipeFormEnabled(enabled) {
    Array.from(recipeForm.elements).forEach(element => {
        element.disabled = !enabled;
    });

    if (!enabled) {
        setStatus("Create a category first.");
    }
}

function setAdminUiEnabled(enabled) {
    openCategoryFormBtn.hidden = !enabled;
    openRecipeFormBtn.hidden = !enabled;
    adminLogoutBtn.hidden = !enabled;
    openAdminLoginBtn.hidden = enabled;

    if (!enabled) {
        editingCategoryId = null;
        editingRecipeId = null;
        showEditor(null);
    }
}

function showEditor(mode = null) {
    const showCategory = mode === "category";
    const showRecipe = mode === "recipe";
    const showAdmin = mode === "admin";
    const showSection = showCategory || showRecipe || showAdmin;

    editorSectionEl.hidden = !showSection;
    adminLoginForm.hidden = !showAdmin;
    categoryForm.hidden = !showCategory;
    recipeForm.hidden = !showRecipe;
    document.body.classList.toggle("is-editing", showSection);

    [adminLoginForm, categoryForm, recipeForm].forEach(form => form.classList.remove("is-open"));
    if (showAdmin) {
        adminLoginForm.classList.add("is-open");
    }
    if (showCategory) {
        categoryForm.classList.add("is-open");
    }
    if (showRecipe) {
        recipeForm.classList.add("is-open");
    }

    openCategoryFormBtn.classList.toggle("active", showCategory);
    openRecipeFormBtn.classList.toggle("active", showRecipe);
    openAdminLoginBtn.classList.toggle("active", showAdmin);

    if (showAdmin) {
        document.getElementById("admin-username").focus();
    }

    if (showCategory) {
        document.getElementById("category-name").focus();
    }

    if (showRecipe) {
        if (selectedCategoryId) {
            categorySelect.value = String(selectedCategoryId);
        }
        document.getElementById("recipe-title").focus();
    }
}

function renderRecipeDetail() {
    const recipe = currentRecipes.find(item => item.id === selectedRecipeId);

    if (!recipe) {
        recipeViewEl.hidden = true;
        recipeViewEl.innerHTML = "";
        return;
    }

    const ingredientsList = escapeHtml(recipe.ingredients)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => `<li>${line}</li>`)
        .join("");

    const instructionsList = escapeHtml(recipe.instructions)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => `<li>${line}</li>`)
        .join("");

    recipeViewEl.hidden = false;
    recipeViewEl.innerHTML = `
        <div class="recipe-header">
            <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
            <p class="recipe-meta">
                <span class="recipe-badge">Category</span>
                <span class="recipe-meta-value">${escapeHtml(recipe.categoryName)}</span>
            </p>
        </div>
        <div class="recipe-section">
            <p class="recipe-label">Ingredients</p>
            <ul class="recipe-list recipe-rtl" dir="rtl">${ingredientsList}</ul>
        </div>
        <div class="recipe-section">
            <p class="recipe-label">Instructions</p>
            <ol class="recipe-list recipe-rtl" dir="rtl">${instructionsList}</ol>
        </div>
        ${recipe.imageUrl ? `<img src="${escapeHtml(recipe.imageUrl)}" alt="${escapeHtml(recipe.title)}" />` : ""}
    `;
}

function renderRecipeNames() {
    if (!selectedCategoryId) {
        workspaceTitleEl.textContent = "Select a category";
//        workspaceSubtitleEl.textContent = "Choose a category from the left menu.";
        emptyStateEl.hidden = false;
        recipesEl.innerHTML = "";
        recipeViewEl.hidden = true;
        return;
    }

    emptyStateEl.hidden = true;
    const selectedCategory = currentCategories.find(c => c.id === selectedCategoryId);
    workspaceTitleEl.textContent = selectedCategory ? selectedCategory.name : "Recipes";
//    workspaceSubtitleEl.textContent = "Click a recipe name to open full details.";

    if (!currentRecipes.length) {
        recipesEl.innerHTML = "<p>No recipes in this category yet.</p>";
        recipeViewEl.hidden = true;
        return;
    }

    const adminEnabled = hasAdminToken();
    recipesEl.innerHTML = currentRecipes.map(recipe => {
        const activeClass = recipe.id === selectedRecipeId ? "active" : "";
        return `
            <div class="recipe-row">
                <button type="button" class="recipe-name ${activeClass}" data-recipe-id="${recipe.id}">${escapeHtml(recipe.title)}</button>
                ${adminEnabled ? `<button type="button" class="edit-btn" data-edit-recipe-id="${recipe.id}" aria-label="Edit ${escapeHtml(recipe.title)}">Edit</button>` : ""}
                ${adminEnabled ? `<button type="button" class="delete-btn" data-delete-recipe-id="${recipe.id}" aria-label="Delete ${escapeHtml(recipe.title)}">x</button>` : ""}
            </div>
        `;
    }).join("");

    document.querySelectorAll("[data-recipe-id]").forEach(button => {
        button.addEventListener("click", () => {
            showEditor(null);
            selectedRecipeId = Number(button.dataset.recipeId);
            transitionOutIn(recipesEl, renderRecipeNames);
            transitionOutIn(recipeViewEl, renderRecipeDetail);
        });
    });

    document.querySelectorAll("[data-delete-recipe-id]").forEach(button => {
        button.addEventListener("click", async event => {
            event.stopPropagation();
            const recipeId = Number(button.dataset.deleteRecipeId);
            const recipe = currentRecipes.find(item => item.id === recipeId);
            if (!recipe) {
                return;
            }

            const confirmed = window.confirm(`Delete recipe "${recipe.title}"?`);
            if (!confirmed) {
                return;
            }

            try {
                await fetchJson(`/api/recipes/${recipeId}`, { method: "DELETE" });
                if (selectedRecipeId === recipeId) {
                    selectedRecipeId = null;
                }
                await loadCategories();
                await loadRecipesForSelectedCategory();
                setStatus("Recipe deleted.");
            } catch (error) {
                setStatus(error.message);
            }
        });
    });

    document.querySelectorAll("[data-edit-recipe-id]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const recipeId = Number(button.dataset.editRecipeId);
            const recipe = currentRecipes.find(item => item.id === recipeId);
            if (!recipe) {
                return;
            }

            editingRecipeId = recipeId;
            selectedRecipeId = recipeId;
            document.getElementById("recipe-title").value = recipe.title;
            document.getElementById("recipe-ingredients").value = recipe.ingredients;
            document.getElementById("recipe-instructions").value = recipe.instructions;
            document.getElementById("recipe-image").value = recipe.imageUrl || "";
            selectedCategoryId = recipe.categoryId;
            categorySelect.value = String(recipe.categoryId);
            recipeFormTitleEl.textContent = "Edit Recipe";
            recipeFormSubmitEl.textContent = "Update Recipe";
            showEditor("recipe");
        });
    });

    transitionOutIn(recipeViewEl, renderRecipeDetail);
}

function renderCategories() {
    categorySelect.innerHTML = currentCategories
        .map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
        .join("");

    const adminEnabled = hasAdminToken();
    categoriesEl.innerHTML = currentCategories.map(category => {
        const activeClass = category.id === selectedCategoryId ? "active" : "";
        return `
            <li>
                <div class="category-row">
                    <button type="button" class="category-main ${activeClass}" data-category-id="${category.id}">
                        ${escapeHtml(category.name)} (${category.recipeCount})
                    </button>
                    ${adminEnabled ? `<button type="button" class="edit-btn" data-edit-category-id="${category.id}" aria-label="Edit ${escapeHtml(category.name)}">Edit</button>` : ""}
                    ${adminEnabled ? `<button type="button" class="delete-btn" data-delete-category-id="${category.id}" aria-label="Delete ${escapeHtml(category.name)}">x</button>` : ""}
                </div>
            </li>
        `;
    }).join("");

    setRecipeFormEnabled(currentCategories.length > 0);

    if (selectedCategoryId && !currentCategories.some(category => category.id === selectedCategoryId)) {
        selectedCategoryId = null;
    }

    if (currentCategories.length && !selectedCategoryId) {
        selectedCategoryId = currentCategories[0].id;
    }

    if (selectedCategoryId) {
        categorySelect.value = String(selectedCategoryId);
    }

    document.querySelectorAll("[data-category-id]").forEach(button => {
        button.addEventListener("click", async () => {
            showEditor(null);
            selectedCategoryId = Number(button.dataset.categoryId);
            selectedRecipeId = null;
            renderCategories();
            await loadRecipesForSelectedCategory();
        });
    });

    document.querySelectorAll("[data-delete-category-id]").forEach(button => {
        button.addEventListener("click", async event => {
            event.stopPropagation();
            const categoryId = Number(button.dataset.deleteCategoryId);
            const category = currentCategories.find(item => item.id === categoryId);
            if (!category) {
                return;
            }

            const confirmed = window.confirm(`Delete category "${category.name}"?`);
            if (!confirmed) {
                return;
            }

            try {
                await fetchJson(`/api/categories/${categoryId}`, { method: "DELETE" });
                if (selectedCategoryId === categoryId) {
                    selectedCategoryId = null;
                    selectedRecipeId = null;
                }
                await loadCategories();
                await loadRecipesForSelectedCategory();
            } catch (error) {
                setStatus(error.message);
            }
        });
    });

    document.querySelectorAll("[data-edit-category-id]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            const categoryId = Number(button.dataset.editCategoryId);
            const category = currentCategories.find(item => item.id === categoryId);
            if (!category) {
                return;
            }

            editingCategoryId = categoryId;
            selectedCategoryId = categoryId;
            document.getElementById("category-name").value = category.name;
            categoryFormTitleEl.textContent = "Edit Category";
            categoryFormSubmitEl.textContent = "Update Category";
            showEditor("category");
        });
    });
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function loadCategories() {
    currentCategories = await fetchJson("/api/categories");
    renderCategories();
}

async function loadRecipesForSelectedCategory() {
    if (!selectedCategoryId) {
        currentRecipes = [];
        transitionOutIn(recipesEl, renderRecipeNames);
        return;
    }

    currentRecipes = await fetchJson(`/api/recipes?categoryId=${selectedCategoryId}`);
    if (selectedRecipeId && !currentRecipes.some(recipe => recipe.id === selectedRecipeId)) {
        selectedRecipeId = null;
    }
    transitionOutIn(recipesEl, renderRecipeNames);
}

adminLoginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
        const response = await fetchJson("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });
        window.localStorage.setItem("cookbookAdminToken", response.token);
        adminLoginForm.reset();
        setAdminUiEnabled(true);
        showEditor(null);
        renderCategories();
        renderRecipeNames();
        setStatus("Admin signed in.");
    } catch (error) {
        setStatus(error.message);
    }
});

categoryForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!hasAdminToken()) {
        setStatus("Admin access required.");
        return;
    }
    const name = document.getElementById("category-name").value;

    try {
        const isEditing = Boolean(editingCategoryId);
        const targetId = editingCategoryId;
        await fetchJson(isEditing ? `/api/categories/${targetId}` : "/api/categories", {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify({ name })
        });

        categoryForm.reset();
        editingCategoryId = null;
        categoryFormTitleEl.textContent = "Add Category";
        categoryFormSubmitEl.textContent = "Save Category";
        showEditor(null);
        if (targetId) {
            selectedCategoryId = targetId;
        }
        await loadCategories();
        await loadRecipesForSelectedCategory();
        setStatus(isEditing ? "Category updated." : "Category saved.");
    } catch (error) {
        setStatus(error.message);
    }
});

recipeForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!hasAdminToken()) {
        setStatus("Admin access required.");
        return;
    }

    const categoryId = Number(categorySelect.value);
    if (!categoryId) {
        setStatus("Select a category first.");
        return;
    }

    const payload = {
        title: document.getElementById("recipe-title").value,
        ingredients: document.getElementById("recipe-ingredients").value,
        instructions: document.getElementById("recipe-instructions").value,
        imageUrl: document.getElementById("recipe-image").value,
        categoryId
    };

    try {
        const isEditing = Boolean(editingRecipeId);
        const targetId = editingRecipeId;
        await fetchJson(isEditing ? `/api/recipes/${targetId}` : "/api/recipes", {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });

        recipeForm.reset();
        editingRecipeId = null;
        recipeFormTitleEl.textContent = "Add Recipe";
        recipeFormSubmitEl.textContent = "Save Recipe";
        showEditor(null);
        selectedCategoryId = categoryId;
        if (targetId) {
            selectedRecipeId = targetId;
        }
        await loadCategories();
        await loadRecipesForSelectedCategory();
        setStatus(isEditing ? "Recipe updated." : "Recipe saved.");
    } catch (error) {
        setStatus(error.message);
    }
});

openCategoryFormBtn.addEventListener("click", () => {
    if (!hasAdminToken()) {
        setStatus("Admin access required.");
        return;
    }
    if (categoryForm.hidden) {
        editingCategoryId = null;
        categoryForm.reset();
        categoryFormTitleEl.textContent = "Add Category";
        categoryFormSubmitEl.textContent = "Save Category";
    }
    showEditor(categoryForm.hidden ? "category" : null);
});

openRecipeFormBtn.addEventListener("click", () => {
    if (!hasAdminToken()) {
        setStatus("Admin access required.");
        return;
    }
    if (recipeForm.hidden) {
        editingRecipeId = null;
        recipeForm.reset();
        recipeFormTitleEl.textContent = "Add Recipe";
        recipeFormSubmitEl.textContent = "Save Recipe";
    }
    showEditor(recipeForm.hidden ? "recipe" : null);
});

openAdminLoginBtn.addEventListener("click", () => {
    showEditor(adminLoginForm.hidden ? "admin" : null);
});

closeEditorButtons.forEach(button => {
    button.addEventListener("click", () => {
        showEditor(null);
    });
});

adminLogoutBtn.addEventListener("click", () => {
    window.localStorage.removeItem("cookbookAdminToken");
    setAdminUiEnabled(false);
    showEditor(null);
    renderCategories();
    renderRecipeNames();
    setStatus("Admin signed out.");
});

editorSectionEl.hidden = true;
adminLoginForm.hidden = true;
categoryForm.hidden = true;
recipeForm.hidden = true;

async function init() {
    try {
        showEditor(null);
        setAdminUiEnabled(hasAdminToken());
        await loadCategories();
        await loadRecipesForSelectedCategory();
    } catch (error) {
        setStatus(error.message);
    }
}

init();
