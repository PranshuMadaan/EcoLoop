# EcoLoop Engineering Bug Log & Root Cause Analysis

## Methodology
Every bug documented herein was resolved following the **Mandatory 6-Step Debugging Workflow**:
1. **Replicate**: Isolated the environment, endpoint parameters, and failure conditions.
2. **Write a Failing Test**: Created reproduction test in `tests/bugs/reproduce_phase1_bugs.test.js` and confirmed test failure before touching application code.
3. **Trace Root Cause**: Pinpointed the specific code paths, unhandled variables, and missing validations.
4. **Apply Minimal Fix**: Applied targeted fixes in `src/` adhering strictly to scope.
5. **Verify & Break**: Re-ran the reproduction tests and full test suite with edge cases (SQL injection strings, invalid formats, boundary conditions).
6. **Document**: Recorded code-level comments and this log.

---

## Resolved Bugs

### BUG-001: Missing Enum Validation for `material_grade` in Scrap Listings
- **Target Area**: `src/controllers/listingController.js`
- **Severity**: Medium
- **Symptoms**: `POST /api/v1/listings` accepted arbitrary, unapproved strings (e.g. `"ToxicChemicalWaste"`, `"PET'; DROP TABLE..."`) for `material_grade`.
- **Root Cause**: `createListing` only checked that `material_grade` was a non-empty string. It lacked validation against canonical marketplace scrap grades.
- **Resolution**: Defined `ALLOWED_MATERIAL_GRADES = ['PET', 'HDPE', 'LDPE', 'PP', 'E-Waste', 'Paper', 'Cardboard', 'Metal']` and added case-insensitive matching in `createListing` before triggering any database queries.
- **Automated Verification**: `tests/bugs/reproduce_phase1_bugs.test.js: Bug 1` verifies that invalid materials and SQL injection attempts are rejected with HTTP 400 Bad Request.

---

### BUG-002: Loose Mobile Number Validation in User Registration
- **Target Area**: `src/controllers/userController.js` & `src/controllers/authController.js`
- **Severity**: High
- **Symptoms**: Registration accepted arbitrary non-numeric text (e.g., `"+91-INVALID-NUMB"`, `"abcdefghijk"`) as long as string length was at least 10 characters.
- **Root Cause**: Validation only evaluated `mobile_number.trim().length < 10`, allowing alphanumeric characters and symbols into the database.
- **Resolution**: Implemented `MOBILE_REGEX = /^\+?[0-9]{10,15}$/` to validate standard E.164 and national phone numbers (10–15 digits with optional leading `+`).
- **Automated Verification**: `tests/bugs/reproduce_phase1_bugs.test.js: Bug 2` tests non-numeric strings, symbols, and under-length numbers to guarantee 400 Bad Request responses.

---

### BUG-003: Unvalidated `verification_status` Filter in User Listing
- **Target Area**: `src/controllers/userController.js`
- **Severity**: Low
- **Symptoms**: `GET /api/v1/users?verification_status=GARBAGE_STATUS` accepted arbitrary status filters and issued queries instead of rejecting invalid parameters.
- **Root Cause**: The status parameter was passed directly to the SQL query after uppercasing without validating against the schema's allowed enum values.
- **Resolution**: Defined `VALID_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED']` and added an explicit check throwing `AppError(..., 400)` for unapproved statuses.
- **Automated Verification**: `tests/bugs/reproduce_phase1_bugs.test.js: Bug 3` verifies that invalid `verification_status` query parameters return 400 Bad Request.

---

### BUG-004: Sensitive Error Details & Stack Leaks in Production Mode
- **Target Area**: `src/middleware/errorHandler.js`
- **Severity**: High
- **Symptoms**: When unexpected 500 errors occurred, `errorHandler` passed `err.message` directly into JSON response bodies regardless of `NODE_ENV`. In production, this exposed internal database connection strings, table names, and system details.
- **Root Cause**: `errorHandler` lacked sanitization for non-operational / 500 status errors when `process.env.NODE_ENV === 'production'`.
- **Resolution**: Added a guard:
  ```javascript
  if (statusCode >= 500 && process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Internal Server Error';
  }
  ```
  This sanitizes 500 errors while preserving safe, operational client error messages.
- **Automated Verification**: `tests/bugs/reproduce_phase1_bugs.test.js: Bug 4` verifies that internal error messages are sanitized to `"Internal Server Error"` in production mode while operational error messages are preserved.

---

### BUG-005: HTML5 Step-Mismatch Validation Rejection on Valid Bid Amounts
- **Target Area**: `frontend/index.html` & `frontend/src/main.js`
- **Severity**: Medium
- **Symptoms**: When entering a valid bid amount (such as ₹26,760 on a ₹26,250 reserve listing), form submission was blocked with the browser validation message: *"Please enter a valid value. The two nearest valid values are 26751 and 26801."*
- **Root Cause**: The bid input `<input type="number" id="bid-amount-input">` had `step="50"`. In HTML5 form validation, when `min` is dynamically set to an offset boundary (e.g., `targetThreshold + 1 = 26751`), the browser strictly allows only `min + (k * step)` (e.g., 26751, 26801, 26851). Arbitrary round amounts (e.g. 26760) failed the step-alignment check despite being well above the minimum bid.
- **Resolution**:
  1. Changed `step="50"` to `step="any"` on `bid-amount-input`, `create-weight`, and `create-price` in `frontend/index.html`.
  2. In `frontend/src/main.js`, dynamically enforced `elements.bidAmountInput.step = 'any'` and corrected the minimum bid calculation:
     `const minimumBid = highestBid > 0 ? highestBid + 1 : minPrice;`
- **Verification**: Tested bid submission with ₹26,760 via API and verified form acceptance and database persistence.

---

## Verification Summary
- **Test Command**: `npm test`
- **Total Tests**: 58 passing tests across 23 test suites
- **Regressions**: 0
