# TriWheel UI/UX Standards & Component Library

**Last Updated:** June 1, 2026  
**Status:** ✅ IMPLEMENTED & VALIDATED

---

## 1. DESIGN TOKENS

### Colors
```css
/* Primary Brand */
--primary:        #F4623A  (Orange - Primary Actions)
--primary-dark:   #D94E28  (Hover State)
--primary-light:  #FDF0EC  (Background Tint)
--primary-soft:   rgba(244, 98, 58, 0.12)  (Subtle Highlights)

/* Secondary */
--secondary:      #0EA5E9  (Blue - Accents)
--secondary-light: #E0F5FF  (Light Blue Background)

/* Semantic Colors */
--success:        #10B981  (Green - Approvals)
--danger:         #EF4444  (Red - Errors/Deletions)
--warning:        #F59E0B  (Amber - Alerts)
--info:           #3B82F6  (Blue - Information)

/* Neutrals */
--dark:           #1A1D23  (Text - Primary)
--gray:           #6B7280  (Text - Secondary)
--gray-light:     #E5E7EB  (Borders)
--gray-pale:      #F3F4F6  (Backgrounds)
--white:          #FFFFFF  (White)
```

### Typography
- **Display Font:** Sora (Headers, prominent text)
- **Body Font:** DM Sans (Body text, forms, labels)
- **Font Sizes:** Use `clamp()` for responsive scaling

### Spacing
```css
--r-xs:   4px
--r-sm:   8px
--r-md:   12px    (Default border-radius)
--r-lg:   16px
--r-xl:   24px
--r-2xl:  32px
--r-full: 9999px  (Pill buttons)
```

### Shadows
```css
--shadow-xs:  0 1px 2px rgba(0,0,0,0.05)       (Subtle)
--shadow-sm:  0 1px 3px rgba(0,0,0,0.06)       (Cards)
--shadow-md:  0 4px 12px rgba(0,0,0,0.07)      (Dropdowns)
--shadow-lg:  0 10px 30px rgba(0,0,0,0.08)     (Modals)
--shadow-primary: 0 8px 24px rgba(244,98,58,0.25)  (Primary Actions)
```

---

## 2. BUTTON COMPONENTS

### Basic Buttons
```html
<!-- Primary (Main Actions) -->
<button class="btn-primary">Save Changes</button>

<!-- Secondary (Alternative Actions) -->
<button class="btn-secondary">Cancel</button>

<!-- Success (Positive Actions) -->
<button class="btn-success">Approve</button>

<!-- Danger (Destructive Actions) -->
<button class="btn-danger">Delete</button>
```

### Button Sizes
```html
<button class="btn-xs">Extra Small (6px 12px)</button>
<button class="btn-sm">Small (8px 16px)</button>
<button class="btn-primary">Default (11px 24px)</button>
<button class="btn-lg">Large (14px 32px)</button>
<button class="btn-xl">Extra Large (16px 40px)</button>
```

### Special Button Types
```html
<!-- Block Width (Full Width) -->
<button class="btn-primary btn-block">Full Width Action</button>

<!-- Icon Button -->
<button class="btn-icon btn-secondary"><i class="fas fa-pen"></i></button>
<button class="btn-icon-sm btn-secondary"><i class="fas fa-x"></i></button>

<!-- Disabled State -->
<button class="btn-primary" disabled>Disabled</button>
```

**DO:**
- Use `.btn-primary` for main actions (Submit, Send, Confirm)
- Use `.btn-secondary` for alternative paths (Cancel, Go Back)
- Use `.btn-success` for approvals and positive outcomes
- Use `.btn-danger` for destructive actions

**DON'T:**
- Use inline `style="..."` attributes for button styling
- Mix button colors (e.g., primary button with secondary styling)
- Create custom button colors outside the design system

---

## 3. FORM COMPONENTS

### Form Groups
```html
<div class="form-group">
    <label class="form-label">Name *</label>
    <input type="text" class="form-input" placeholder="Enter name" required>
    <span class="form-hint">Must be at least 3 characters</span>
</div>
```

### Form Elements
```html
<!-- Text Input -->
<input type="text" class="form-input" placeholder="Enter text">

<!-- Select Dropdown -->
<select class="form-select">
    <option>Choose option</option>
</select>

<!-- Textarea -->
<textarea class="form-textarea" rows="4"></textarea>

<!-- Focused State (Automatic on :focus) -->
<!-- Border: var(--primary) -->
<!-- Box-shadow: 0 0 0 3px var(--primary-soft) -->
```

### Form States
```html
<!-- Success State -->
<input type="text" class="form-input form-success">

<!-- Error State -->
<input type="text" class="form-input form-error">
<span class="form-error-text">This field is required</span>
```

**DO:**
- Use `.form-group` wrapper for consistent spacing
- Use `.form-label` for all input labels
- Use `.form-hint` for helper text
- Show error messages with `.form-error-text`

**DON'T:**
- Use inline styles for form inputs
- Create custom error handling without `.form-error` class
- Mix input sizes or border styles

---

## 4. MODAL & OVERLAY PATTERNS

### Modal Structure
```html
<div id="editModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;">
    <div style="background:#fff;margin:50px auto;padding:30px;border-radius:10px;max-width:500px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <h3 style="margin-top:0;">Modal Title</h3>
        
        <!-- Form Content -->
        <form id="editForm" style="display:flex;flex-direction:column;gap:15px;">
            <div class="form-group">
                <label class="form-label">Field Name</label>
                <input type="text" class="form-input" name="field_name">
            </div>
            
            <!-- Footer -->
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Changes</button>
            </div>
        </form>
    </div>
</div>
```

**Key Features:**
- Backdrop: `background:rgba(0,0,0,0.5)`
- Modal Z-index: `z-index:1000` (above other content)
- Content margin: `margin:50px auto` (vertical/horizontal centering)
- Button gap: `gap:10px` for consistent spacing

---

## 5. CARD & LAYOUT PATTERNS

### Dashboard Cards
```html
<div class="dashboard-card">
    <div class="card-header">
        <h3><i class="fas fa-chart-line"></i> Card Title</h3>
    </div>
    <div class="card-content">
        <!-- Content here -->
    </div>
</div>
```

### Table Styling
```html
<table class="request-table">
    <thead>
        <tr>
            <th style="padding:12px 14px;text-align:left;">Column 1</th>
            <th style="padding:12px 14px;text-align:left;">Column 2</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #f0f0f0;">Data 1</td>
            <td style="padding:12px 14px;border-bottom:1px solid #f0f0f0;">Data 2</td>
        </tr>
    </tbody>
</table>
```

---

## 6. IMPLEMENTATION CHECKLIST

### ✅ Completed Changes
- [x] Added button size variants (.btn-xs through .btn-xl)
- [x] Added form component styles (.form-group, .form-input, etc.)
- [x] Added button state classes (.btn-disabled, .btn-error-text)
- [x] Updated admin_dashboard.php modal buttons
- [x] Updated passenger.php rating modal buttons
- [x] Updated driver.php rating modal buttons
- [x] Updated active_rides.php accept button
- [x] Updated vehicle_info.php back button
- [x] All files validated with `php -l`

### 🔄 Files Updated
- `style.css` - Added component library
- `admin_dashboard.php` - Removed inline button styles
- `passenger.php` - Standardized rating modal buttons
- `driver.php` - Standardized rating modal buttons
- `active_rides.php` - Standardized accept button
- `vehicle_info.php` - Standardized back button

### ⚠️ Known Issues Resolved
| Issue | Status | Solution |
|-------|--------|----------|
| Inconsistent button styling | ✅ Fixed | Use button classes instead of inline styles |
| Admin role color mismatch | ✅ Fixed | Using consistent var(--primary) throughout |
| Modal focus trap | ⏳ TODO | Add keyboard handler (Escape key) |
| ARIA labels | ⏳ TODO | Add aria-label attributes to buttons |

---

## 7. BEST PRACTICES

### DO's
✅ Use design token variables (--primary, --shadow-md, etc.)  
✅ Apply classes instead of inline styles  
✅ Use .form-group for all form fields  
✅ Implement loading states with .btn-primary:disabled  
✅ Test responsive behavior with `clamp()`  
✅ Use semantic color classes (.btn-success, .btn-danger)  

### DON'Ts
❌ Create custom colors outside design tokens  
❌ Use inline `style="..."` for component styling  
❌ Mix button sizes within a component  
❌ Use hardcoded pixel values for spacing  
❌ Apply gradients manually (use utility classes)  
❌ Ignore focus states for accessibility  

---

## 8. TESTING CHECKLIST

### Desktop (1024px+)
- [ ] All buttons display correctly
- [ ] Forms validate and show errors properly
- [ ] Modals center and display correctly
- [ ] Shadows and depth appear as intended

### Tablet (768px - 1023px)
- [ ] Buttons stack appropriately
- [ ] Forms remain usable
- [ ] Modal width adapts
- [ ] Navigation drawer works

### Mobile (< 768px)
- [ ] Buttons are touch-friendly (min 44px height)
- [ ] Forms use full width
- [ ] Modals fill screen with padding
- [ ] No horizontal scroll

---

## 9. FUTURE ENHANCEMENTS

- [ ] Add keyboard navigation to modals (Escape key)
- [ ] Add ARIA labels and roles for accessibility
- [ ] Create loading skeleton components
- [ ] Add toast notification component
- [ ] Create button animation library
- [ ] Implement dark mode support
- [ ] Add form validation library integration

---

**Questions?** Refer to the CSS file for the complete component definitions or check specific PHP files for implementation examples.
