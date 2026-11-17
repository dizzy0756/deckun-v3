import { api } from "../api.js";

const rupee = (amount) => {
  if (amount == null) return "Rs 0.00";
  return "Rs " + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
};

export async function render({ id }) {
  const isNew = id === "new";
  const app = document.getElementById("app");

  if (!isNew) {
    app.innerHTML = `<section class="section"><div class="container"><div class="section-header"><h2>Edit Product</h2></div><div class="loading">Loading product...</div></div></section>`;
    try {
      const product = await api.get(`/api/admin/products/${id}`);
      renderEditForm(app, product, false, id);
    } catch (err) {
      app.innerHTML = `<div class="error-text">Product not found.</div><a href="#products" class="btn btn-secondary">Back to Products</a>`;
    }
  } else {
    app.innerHTML = `
      <section class="section">
        <div class="section-header">
          <h2>Add New Product</h2>
          <p>Create a new product in the catalogue</p>
        </div>
        <div id="product-edit-form"></div>
      </section>
    `;
    renderEditForm(app, null, true, null);
  }
}

function variantRowHtml(variant, index) {
  const v = variant || {};
  return `
    <div class="variant-row" data-index="${index}" data-id="${v.id || ""}"
         style="display:grid;grid-template-columns:1fr 1fr 1.4fr 1fr 0.8fr auto;gap:0.5rem;align-items:end;margin-bottom:0.5rem;">
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.75rem;">Colour</label>
        <input type="text" class="form-control" data-field="color" value="${escapeHtml(v.color || "")}" placeholder="Black" />
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.75rem;">Size</label>
        <input type="text" class="form-control" data-field="size" value="${escapeHtml(v.size || "")}" placeholder="M" />
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.75rem;">SKU</label>
        <input type="text" class="form-control" data-field="sku" value="${escapeHtml(v.sku || "")}" placeholder="auto" />
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.75rem;">Price</label>
        <input type="number" min="0" class="form-control" data-field="price" value="${v.price != null ? v.price : ""}" />
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-size:0.75rem;">Stock</label>
        <input type="number" min="0" class="form-control" data-field="stock" value="${v.stock != null ? v.stock : 0}" />
      </div>
      <button type="button" class="btn btn-danger btn-sm" data-remove-variant style="height:38px;">x</button>
    </div>
  `;
}

function renderEditForm(app, product, isNew, productId) {
  const categories = ["outdoor", "furniture", "storage"];
  const statuses = ["active", "hidden", "archived"];

  const existingImages = (product && product.images) || [];
  const existingVariants = (product && product.variants) || [];
  const hasVariants = !!(product && product.has_variants) || existingVariants.length > 1;

  const formHtml = `
    <form id="product-form" style="max-width:900px;">
      <div class="form-group">
        <label>Product Name *</label>
        <input type="text" name="name" value="${escapeHtml(product ? product.name : "")}" required class="form-control" />
      </div>
      <div class="form-group">
        <label>Slug (URL-friendly) *</label>
        <input type="text" name="slug" value="${escapeHtml(product ? product.slug : "")}" required class="form-control" placeholder="camping-tent" />
      </div>
      <div class="form-group">
        <label>Category</label>
        <select name="category" class="form-control">
          ${categories.map(c => `<option value="${c}" ${product && product.category_name === c ? "selected" : ""}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Description *</label>
        <textarea name="description" rows="4" class="form-control" required>${escapeHtml(product ? product.description : "")}</textarea>
      </div>

      <div class="form-group">
        <label>Does this product have variants (colour / size)?</label>
        <select name="has_variants" id="has-variants" class="form-control">
          <option value="false" ${!hasVariants ? "selected" : ""}>No - single product</option>
          <option value="true" ${hasVariants ? "selected" : ""}>Yes - colour and/or size</option>
        </select>
      </div>

      <div id="variants-section" style="display:${hasVariants ? "block" : "none"}; margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <strong>Variants</strong>
          <button type="button" id="add-variant" class="btn btn-secondary btn-sm">+ Add variant</button>
        </div>
        <p style="color:var(--color-text-muted);font-size:0.8rem;margin-bottom:0.5rem;">
          Each combination of colour and size is one variant. Leave a field blank if the product does not use it.
        </p>
        <div id="variant-rows">
          ${(existingVariants.length ? existingVariants : [{}]).map((v, i) => variantRowHtml(v, i)).join("")}
        </div>
      </div>

      <div class="form-group">
        <label>Base Price (Rs) *</label>
        <input type="number" name="base_price" value="${product ? product.base_price || 0 : ""}" required class="form-control" min="0" />
        <small style="color:var(--color-text-muted);">Shown when the product has no variants; also used as the starting price for variants.</small>
      </div>
      <div class="form-group">
        <label>Discount %</label>
        <input type="number" name="discount_percent" value="${product ? product.discount_percent || 0 : ""}" class="form-control" min="0" max="100" step="0.01" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status" class="form-control">
          ${statuses.map(s => `<option value="${s}" ${product && product.status === s ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Featured Product</label>
        <select name="is_featured" class="form-control">
          <option value="false" ${product && product.is_featured === false ? "selected" : ""}>No</option>
          <option value="true" ${product && product.is_featured === true ? "selected" : ""}>Yes</option>
        </select>
      </div>
      <div class="form-group">
        <label>Meta Title (SEO)</label>
        <input type="text" name="meta_title" value="${escapeHtml(product ? product.meta_title : "")}" class="form-control" />
      </div>
      <div class="form-group">
        <label>Meta Description (SEO)</label>
        <textarea name="meta_description" rows="3" class="form-control">${escapeHtml(product ? product.meta_description : "")}</textarea>
      </div>

      <div class="form-group">
        <label>Product Images</label>
        ${!isNew ? `
        <div style="margin-bottom:0.75rem;">
          <input type="file" id="image-upload" accept="image/*" class="form-control" />
          <small style="color:var(--color-text-muted);">JPG, PNG, WEBP. Max 5MB each.</small>
        </div>
        <div id="image-preview" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
          ${existingImages.map((img, idx) => `
            <div style="position:relative; width:100px; height:100px;">
              <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt_text || "")}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius);" />
              <button type="button" onclick="removeImage('${productId}', '${img.id}')" style="position:absolute; top:-5px; right:-5px; background:var(--color-error); color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:10px;">x</button>
              ${idx === 0 ? `<span style="position:absolute; bottom:-20px; font-size:10px; color:var(--color-text-muted);">Primary</span>` : ""}
            </div>
          `).join("") || `<p style="color:var(--color-text-muted); font-size:0.875rem;">No images yet.</p>`}
        </div>
        ` : `<div style="color:var(--color-text-muted); font-size:0.875rem;">Image upload available after the product is created.</div>`}
      </div>

      <div class="form-actions" style="display:flex;gap:0.5rem;margin-top:1.5rem;">
        <button type="submit" class="btn btn-primary">${isNew ? "Create Product" : "Save Changes"}</button>
        <a href="#products" class="btn btn-secondary">Cancel</a>
        ${!isNew ? `<button type="button" id="delete-btn" class="btn btn-danger">Delete Product</button>` : ""}
      </div>
    </form>
  `;

  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>${isNew ? "Add New Product" : "Edit Product"}</h2>
        <a href="#products" class="btn btn-secondary">Back to Products</a>
      </div>
      ${formHtml}
    </section>
  `;

  const form = document.getElementById("product-form");
  const hasVariantsSelect = document.getElementById("has-variants");
  const variantsSection = document.getElementById("variants-section");
  const variantRows = document.getElementById("variant-rows");

  const bindRemoveButtons = () => {
    variantRows.querySelectorAll("[data-remove-variant]").forEach((btn) => {
      btn.onclick = () => {
        if (variantRows.children.length === 1) {
          alert("Keep at least one variant, or switch variants off.");
          return;
        }
        btn.closest(".variant-row").remove();
      };
    });
  };

  hasVariantsSelect.addEventListener("change", () => {
    const on = hasVariantsSelect.value === "true";
    variantsSection.style.display = on ? "block" : "none";
    if (on && variantRows.children.length === 0) {
      variantRows.innerHTML = variantRowHtml({}, 0);
      bindRemoveButtons();
    }
  });

  document.getElementById("add-variant").addEventListener("click", () => {
    const index = variantRows.children.length;
    variantRows.insertAdjacentHTML("beforeend", variantRowHtml({}, index));
    bindRemoveButtons();
  });

  bindRemoveButtons();

  const imageInput = document.getElementById("image-upload");
  const imagePreview = document.getElementById("image-preview");

  if (!isNew && imageInput && imagePreview) {
    imageInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      const previewDiv = document.createElement("div");
      previewDiv.style.cssText = "position:relative; width:100px; height:100px;";
      reader.onload = (ev) => {
        previewDiv.innerHTML = `
          <img src="${ev.target.result}" alt="Uploading..." style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius); opacity:0.7;" />
        `;
        imagePreview.insertBefore(previewDiv, imagePreview.firstChild);
      };
      reader.readAsDataURL(file);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const resp = await api.post(`/api/admin/products/${productId}/images`, formData);
        previewDiv.innerHTML = `
          <img src="${resp.url}" alt="${file.name}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius);" />
          <button type="button" onclick="removeImage('${productId}', '${resp.id}')" style="position:absolute; top:-5px; right:-5px; background:var(--color-error); color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:10px;">x</button>
        `;
      } catch (err) {
        previewDiv.remove();
        alert("Image upload failed: " + err.message);
      }

      e.target.value = "";
    });
  }

  const collectVariants = () => {
    const rows = Array.from(variantRows.querySelectorAll(".variant-row"));
    const result = [];
    for (const row of rows) {
      const get = (field) => row.querySelector(`[data-field="${field}"]`)?.value.trim() || "";
      const color = get("color");
      const size = get("size");
      let sku = get("sku");
      const price = parseInt(get("price"), 10);
      const stock = parseInt(get("stock"), 10) || 0;
      const rowId = row.dataset.id;

      if (!color && !size) continue;
      if (!sku) {
        const slug = (form.slug.value || "sku").trim().toUpperCase();
        sku = [slug, color, size].filter(Boolean).join("-").replace(/\s+/g, "-");
      }
      if (isNaN(price)) {
        return { error: "Every variant needs a price." };
      }

      result.push({
        ...(rowId ? { id: rowId } : {}),
        sku,
        name: [color, size].filter(Boolean).join(" / ") || "Default",
        color: color || null,
        size: size || null,
        price,
        stock,
        is_active: true,
      });
    }
    return { variants: result };
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const categoryMap = { outdoor: 1, furniture: 2, storage: 3 };
    const hasVariants = formData.get("has_variants") === "true";

    const payload = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      category_id: categoryMap[formData.get("category")],
      description: formData.get("description"),
      base_price: parseInt(formData.get("base_price"), 10) || 0,
      discount_percent: parseFloat(formData.get("discount_percent")) || 0,
      status: formData.get("status"),
      is_featured: formData.get("is_featured") === "true",
      meta_title: formData.get("meta_title") || null,
      meta_description: formData.get("meta_description") || null,
      has_variants: hasVariants,
    };

    if (hasVariants) {
      const { variants, error } = collectVariants();
      if (error) {
        alert(error);
        return;
      }
      if (!variants.length) {
        alert("Add at least one variant (colour and/or size), or switch variants off.");
        return;
      }
      const skus = variants.map((v) => v.sku.toLowerCase());
      if (new Set(skus).size !== skus.length) {
        alert("Two variants have the same SKU. Make each SKU unique.");
        return;
      }
      payload.variants = variants;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = isNew ? "Creating..." : "Saving...";

    try {
      if (isNew) {
        await api.post("/api/admin/products/", payload);
        alert("Product created successfully!");
      } else {
        await api.patch(`/api/admin/products/${productId}`, payload);
        alert("Product updated successfully!");
      }
      window.location.hash = "#products";
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = isNew ? "Create Product" : "Save Changes";
    }
  });

  if (!isNew) {
    document.getElementById("delete-btn").addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this product?")) return;
      try {
        await api.delete(`/api/admin/products/${productId}`);
        alert("Product deleted.");
        window.location.hash = "#products";
      } catch (err) {
        alert("Failed to delete: " + err.message);
      }
    });
  }
}

window.removeImage = async function (productId, imageId) {
  if (!confirm("Remove this image?")) return;
  try {
    await api.delete(`/api/admin/products/${productId}/images/${imageId}`);
    window.location.reload();
  } catch (e) {
    alert("Failed to remove image: " + e.message);
  }
};
