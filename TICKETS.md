
# KAN-1: Node: Add Linting Check (Frontend)
Add in linting checks to ensure our code is consistent across the UI & API applications (Frontend and backend)
Linter should use biome
## ACs
•	npm run lint - should run the linter and flag any issues
•	npm run lint:fix - should run the linter and auto fix any issues it can
•	Linting is ran before any code can be pushed to github. *Hint: See here: Husky
 
See the biome docs for flags or use the academy-content repo for more info on linting "design/009-linting-is-executable-policy".

---
---

# KAN-2: Node: Add Linting Check (Backend)
Add in linting checks to ensure our code is consistent across the UI & API applications (Frontend and backend)
Linter should use biome
## ACs
•	npm run lint - should run the linter and flag any issues
•	npm run lint:fix - should run the linter and auto fix any issues it can
•	Linting is ran before any code can be pushed to github. *Hint: See here: https://typicode.github.io/husky/
 
See the biome docs for flags or use the academy-content repo for more info on linting "design/009-linting-is-executable-policy".

---
---

# KAN-3: JavaScript: Add unit tests (frontend)
Add in unit testing with ViTest to ensure we have automated tests against our code.
## ACs
•	npm run test - should execute unit tests
•	npm run test:ui - should execute ui tests (if required)
•	npm run test:coverage - should generate a coverage report
•	Test coverage % must be 100%
•	Add a vitest.config.ts file at the root of your project to test all files in your test directory

---
---

# KAN-4: JavaScript: Add unit tests (backend)
Add in unit testing with ViTest to ensure we have automated tests against our code.
## ACs
•	npm run test - should execute unit tests
•	npm run test:ui - should execute ui tests (if required)
•	npm run test:coverage - should generate a coverage report
•	Test coverage % must be 100%
•	Add a vitest.config.ts file at the root of your project to test all files in your test directory

---
---

# KAN-5: Node: Create Frontend Project
Create a basic node project for the frontend.
Using AI, create an Express service with Typescript.
You will need to install nvm (latest), Node.js 22 and npm 10+ which ships with node 22.
See node/001-what-is-node and 002-package-json-and-dependencies for assistance.
## ACs:
•	npm run build - builds the project and stores it in ./dist
•	npm run dev - runs the project in hot reload mode
•	npm run start - starts the project from the ./dist folder
•	GET /health returns a 200 response with the status JSON
The following packages should be installed:
•	express
•	nunjucks
The app should scaffold a basic express app that exposes a single /health endpoint
This will return a json object of the following format
{
"status": "UP",
"time": current timestamp
}
The app should show a basic html page with hello world on it when the user hits /
e.g http://localhost:3000 gives back hello world in html
No styling necessary.
We recommend copying the contents of the following repo for this into your repo:

---
---

# KAN-6: Node: Create Backend Project
Using AI, create an Express service with Typescript.
You will need to install nvm (latest), Node.js 22 and npm 10+ which ships with node 22.
See node/001-what-is-node and 002-package-json-and-dependencies for assistance.
__
Create a basic node project for the api backend.
## ACs:
•	npm run build - builds the project and stored it in ./dist
•	npm run dev - runs the project in hot reload mode
•	npm run start - starts the project from the dist folder
•	GET /health returns a 200 response with the status JSON
The following packages should be installed:
•	express
The app should scaffold a basic express app that exposes a single /health endpoint
This will return a json object of the following format
{
"status": "UP",
"time": current timestamp
}
__
We recommend copying the contents of the following repo for this into your repo:

---
---

# KAN 7: Github: Create Github Actions pipeline in Frontend Project
Create a github actions file which will build, lint and test your code for each pull request opened or when a branch is merged. PR merging must be blocked if the github actions fails at any point.
See 'using-git' 0004 + 0005-github-actions-tests-on-push in the content repo for assistance.
 
## Acs
Github actions flow that performs
•	Build
•	Linting
•	Tests
on both frontend and backend repositories.
The pipeline must run when:
•	A new pull request is opened
•	A branch is merged into main or master
PR merging must be blocked if the pipeline fails.

---
---

# KAN-8: Github: Create Github Actions pipeline in Backend Project]
Create a github actions file which will build, lint and test your code for each pull request opened or when a branch is merged. PR merging must be blocked if the github actions fails at any point.
See 'using-git' 0004 + 0005-github-actions-tests-on-push in the content repo for assistance.
## Acs
Github actions flow that performs
•	Build
•	Linting
•	Tests
on both frontend and backend repositories.
The pipeline must run when:
•	A new pull request is opened
•	A branch is merged into main or master
PR merging must be blocked if the pipeline fails.

---
---

# KAN-9: Display Product Catalogue
## Description
Customers should be able to view a catalogue of products. Each product should display key information including its name, description, category and price.
### Why are we carrying this out?
Customers need to view product information before deciding whether to purchase a product.
### Work to Complete
1.	Display multiple products within the product catalogue.
2.	Display the product name for each product.
3.	Display the product description for each product.
4.	Display the product category for each product.
5.	Display the product price for each product.
6.	Ensure product information is displayed accurately and clearly.
7.	Handle missing or invalid product information appropriately.
## Acceptance Criteria
1.	Multiple products are displayed within the product catalogue.
2.	Each product displays a name.
3.	Each product displays a description.
4.	Each product displays a category.
5.	Each product displays a price.
6.	Prices are displayed in the correct currency format.
7.	Product information is presented clearly to the customer.
8.	Missing or invalid product data is handled appropriately.
9.	An appropriate message is displayed when no products are available.
## Test Scenarios
- Scenario 1: Display Products Successfully
Given products exist in the catalogue
When a customer views the product catalogue
Then all available products are displayed
- Scenario 2: Display Product Information
Given products exist in the catalogue
When a customer views a product listing
Then the product name, description, category and price are displayed
- Scenario 3: Display Product Price Format
Given a product has a valid price
When a customer views the product listing
Then the price is displayed in the correct currency format
- Scenario 4: Missing Product Name
Given a product has a null name value
When a customer views the product listing
Then the product is handled appropriately and the page remains functional
- Scenario 5: Missing Product Description
Given a product has a null description value
When a customer views the product listing
Then the product is handled appropriately and the page remains functional
- Scenario 6: Missing Product Category
Given a product has a null category value
When a customer views the product listing
Then the product is handled appropriately and the page remains functional
- Scenario 7: Missing Product Price
Given a product has a null price value
When a customer views the product listing
Then the product is handled appropriately and an invalid price is not displayed
- Scenario 8: Invalid Product Data
Given a product contains invalid product information
When a customer views the product listing
Then the application handles the data gracefully without displaying corrupted information
- Scenario 9: No Products Available
Given no products exist in the catalogue
When a customer views the product catalogue
Then an appropriate message is displayed
This is probably the most realistic Jira ticket structure, as displaying products, names, descriptions, categories and prices are all part of the same catalogue feature rather than separate pieces of functionality.

---
---

# KAN-10: Filter Products by Category
## Description
Customers should be able to view and select available product categories to filter the product catalogue and display only products relevant to their interests.
### Why are we carrying this out?
Category filtering helps customers quickly narrow down the catalogue, making it easier to find relevant products and improving the browsing experience.
### Work to Complete
1.	Display available categories as filter options.
2.	Load category filter options when the catalogue page is accessed.
3.	Ensure only valid categories are displayed.
4.	Allow customers to select a category filter.
5.	Display only products matching the selected category.
6.	Allow customers to clear the selected category filter.
7.	Display an appropriate message when no categories are available.
8.	Display an appropriate message when no products match the selected category.
## Acceptance Criteria
1.	Available categories are displayed as filter options.
2.	Categories are loaded when the catalogue page is accessed.
3.	Only valid categories are displayed.
4.	Customers can select a category filter.
5.	Only products matching the selected category are displayed.
6.	Customers can clear the category filter and return to viewing all products.
7.	An appropriate message is displayed when no categories are available.
8.	An appropriate message is displayed when no products match the selected category.
## Test Scenarios
- Scenario 1: Display Category Filter Options
Given categories exist in the catalogue
When a customer views the catalogue page
Then all available categories are displayed as filter options
- Scenario 2: Filter Products by Category
Given products exist in multiple categories
When a customer selects a category filter
Then only products belonging to the selected category are displayed
- Scenario 3: Clear Category Filter
Given a category filter has been applied
When the customer clears the filter
Then all available products are displayed
- Scenario 4: No Categories Available
Given no categories exist in the catalogue
When a customer views the catalogue page
Then an appropriate message is displayed
- Scenario 5: No Matching Products
Given no products exist for the selected category
When a customer applies the category filter
Then an appropriate message is displayed indicating that no products were found
- Scenario 6: Invalid Categories Present
Given invalid category records exist
When category filter options are loaded
Then only valid categories are displayed
- Scenario 7: Invalid Category Selection
Given an invalid category is selected
When the filter is applied
Then the system handles the request appropriately and no incorrect products are displayed
- Scenario 8: Category Filter Returns Multiple Products
Given multiple products belong to the selected category
When a customer applies the category filter
Then all matching products are displayed
- Scenario 9: Category Filter Returns Single Product
Given only one product belongs to the selected category
When a customer applies the category filter
Then the single matching product is displayed correctly

---
---

# KAN-11: Hash and Securely Store User Passwords
## Description
User passwords must be securely protected by hashing them before storage. Plain text passwords must never be stored within the system. During authentication, the password entered by the user should be hashed and compared against the stored password hash to determine whether login should be successful.
### Why are we carrying this out?
Storing passwords in plain text presents a significant security risk. Hashing passwords before storage helps protect user credentials and reduces the impact of a potential data breach.
### Work to Complete
1.	Hash passwords during user registration.
2.	Discard the plain text password once hashing has been completed.
3.	Store only the hashed password in the database.
4.	Hash passwords entered during login.
5.	Compare the generated hash against the stored password hash.
6.	Allow login when the hashes match.
7.	Prevent login when the hashes do not match.
8.	Ensure plain text passwords are not stored or exposed by the application.
## Acceptance Criteria
1.	Passwords are hashed before being stored.
2.	Plain text passwords are not stored in the database.
3.	Passwords entered during login are hashed before validation.
4.	Login is successful when the entered password matches the stored password hash.
5.	Login is unsuccessful when the entered password does not match the stored password hash.
6.	Plain text passwords are not exposed in application logs or responses.
## Test Scenarios
- Scenario 1: Register User Successfully
Given a customer enters a valid password during registration
When the account is created
Then the password is hashed and only the hashed value is stored
- Scenario 2: Login with Correct Password
Given a user account exists with a stored password hash
When the user enters their correct password during login
Then the entered password is hashed and authentication is successful
- Scenario 3: Login with Incorrect Password
Given a user account exists with a stored password hash
When the user enters an incorrect password during login
Then the entered password is hashed and authentication is denied
- Scenario 4: Verify Plain Text Password Is Not Stored
Given a user account has been created
When the stored password record is reviewed
Then only a hashed password is present and the plain text password is not stored
- Scenario 5: Verify Passwords Are Not Logged
Given a user registers or logs in
When application logs are generated
Then no plain text password values are present in the logs

---
---

# KAN-12: Implement Customer Registration
## Description
Customers should be able to create an account using their email address and password. Registration should securely store customer credentials and create a new customer profile that can be used for future purchases, order tracking, and account management.
### Why are we carrying this out?
Customers need an account to place orders, manage delivery information, view order history, and access personalised services. Secure registration is essential for protecting customer data and supporting future authentication features.
### Work to complete
1.	Allow customers to register using a unique email address and password.
2.	Validate registration data before account creation.
3.	Enforce password security requirements.
4.	Securely hash and store customer passwords.
5.	Prevent duplicate accounts from being created with the same email address.
6.	Create a customer profile upon successful registration.
7.	Display appropriate validation and error messages when registration fails.
8.	Meet the stated security, performance, availability, and scalability requirements.
## Acceptance Criteria
1.	A customer can register using a unique email address and password and receives confirmation that the account has been createdsuccessfully.
2.	Attempting to register with an email address already associated with an account displays an appropriate error message and does notcreate a second account.
3.	Passwords that do not meet the configured security requirements are rejected and the customer is informed of the validation failure.
4.	Customer passwords are stored securely using password hashing and are never persisted in plain text.
5.	Registration requests complete successfully while meeting the platform's security, availability, and scalability requirements.
## Test Scenarios
- Scenario 1: Successful Registration
Given a customer does not have an existing account
When they submit valid registration details
Then an account is created successfully
- Scenario 2: Duplicate Email
Given an account already exists with a registered email address
When registration is attempted with the same email
Then the registration is rejected with an appropriate error message
- Scenario 3: Invalid Password
Given a customer is registering a new account
When they enter a password that does not meet security requirements
Then registration is rejected and a validation message is displayed

---
---

# KAN-13: Implement Customer Login
## Description
Registered customers should be able to authenticate using their email address and password to access their account and customer services.
### Why are we carrying this out?
Customers must be able to securely access their profile, order history, saved addresses, and checkout functionality. Authentication protectscustomer accounts from unauthorised access.
### Work to complete
1.	Allow customers to authenticate using their email address and password.
2.	Validate credentials against stored account information.
3.	Issue JWT access and refresh tokens upon successful authentication.
4.	Log failed authentication attempts.
5.	Return appropriate error messages for invalid credentials.
6.	Support concurrent authenticated sessions according to configuration.
7.	Meet the stated security, performance, and scalability requirements.
## Acceptance Criteria
1.	A registered customer can log in using a valid email address and password and receives valid authentication tokens.
2.	Invalid email addresses or passwords prevent login and display an appropriate error message.
3.	Successful authentication creates an authorised customer session.
4.	Failed login attempts are recorded in authentication logs.
5.	Login requests complete successfully while meeting the platform's performance and scalability requirements.
## Test Scenarios
- Scenario 1: Successful Login
Given a registered customer exists
When valid login credentials are entered
Then the customer is authenticated successfully
- Scenario 2: Invalid Credentials
Given a registered customer exists
When an incorrect email or password is entered
Then login is rejected and an error message is displayed
- Scenario 3: Authentication Token Issued
Given a customer logs in successfully
When authentication completes
Then valid authentication tokens are issued

---
---

# KAN-14: Implement Remember Me Functionality
## Description
Customers should be able to choose to remain authenticated across browser sessions when using trusted devices.
### Why are we carrying this out?
Customers expect a convenient shopping experience and should not need to repeatedly authenticate on trusted devices.
### Work to complete
1.	Add a "Remember Me" option to the login process.
2.	Support persistent authentication sessions.
3.	Ensure remembered sessions expire according to configured security policies.
4.	Invalidate remembered sessions on logout.
5.	Ensure implementation remains compatible with JWT authentication.
## Acceptance Criteria
1.	Selecting "Remember Me" keeps the customer logged in after restarting their browser.
2.	Not selecting "Remember Me" ends the session according to standard session expiry rules.
3.	Logging out invalidates all active remembered sessions.
4.	Remembered sessions comply with platform security requirements.
## Test Scenarios
- Scenario 1: Remember Me Selected
Given a customer logs in with Remember Me enabled
When the browser is restarted
Then the customer remains logged in
- Scenario 2: Remember Me Not Selected
Given a customer logs in without Remember Me enabled
When the session expires
Then the customer must log in again
- Scenario 3: Logout
Given a remembered session exists
When the customer logs out
Then the remembered session is invalidated

---
---

# KAN-15: Implement Password Reset
## Description
Customers should be able to reset their password if they can no longer access their account using their existing credentials.
### Why are we carrying this out?
Customers frequently forget passwords and require a secure method to regain access without administrator intervention.
### Work to complete
1.	Allow customers to request a password reset using their email address.
2.	Generate secure password reset tokens.
3.	Send password reset instructions to the registered email address.
4.	Allow customers to set a new password using a valid reset token.
5.	Expire reset tokens after the configured time period.
6.	Reject invalid or expired reset tokens.
## Acceptance Criteria
1.	A customer can request a password reset using a registered email address.
2.	A valid password reset token allows the customer to create a new password.
3.	Invalid or expired reset tokens prevent password reset and display an appropriate error message.
4.	The customer can successfully log in using the new password after reset.
5.	Password reset functionality complies with platform security requirements.
## Test Scenarios
- Scenario 1: Request Password Reset
Given a registered customer account exists
When a password reset is requested
Then reset instructions are sent to the registered email address
- Scenario 2: Successful Password Reset
Given a customer has a valid reset token
When a new password is submitted
Then the password is updated successfully
- Scenario 3: Invalid Token
Given a customer has an invalid or expired reset token
When they attempt to reset their password
Then the request is rejected

---
---

# KAN-16: Implement Social Login (Google and Apple)
## Description
Customers should be able to authenticate using supported third-party identity providers instead of creating a local password.
### Why are we carrying this out?
Social login reduces registration friction and helps customers access the platform more quickly.
### Work to complete
1.	Integrate Google authentication.
2.	Integrate Apple authentication.
3.	Link existing customer accounts where email addresses match.
4.	Create new customer accounts when required.
5.	Handle authentication failures gracefully.
6.	Securely manage identity provider tokens and claims.
## Acceptance Criteria
1.	Customers can authenticate using Google accounts.
2.	Customers can authenticate using Apple accounts.
3.	Existing customer accounts are linked when the email address matches.
4.	New customer accounts are created successfully when no matching account exists.
5.	Authentication failures display an appropriate error message and do not create duplicate accounts.
## Test Scenarios
- Scenario 1: Google Login
Given a customer has a Google account
When they authenticate through Google
Then access is granted successfully
- Scenario 2: Apple Login
Given a customer has an Apple account
When they authenticate through Apple
Then access is granted successfully
- Scenario 3: Authentication Failure
Given a customer attempts social authentication
When the identity provider rejects the request
Then an appropriate error message is displayed

---
---

# KAN-17: Implement Customer Profile Management
## Description
Customers should be able to maintain their personal account information.
### Why are we carrying this out?
Customer details can change over time and accurate profile information improves the customer experience and order fulfilment process.
### Work to complete
1.	Display customer profile information.
2.	Allow customers to update editable profile fields.
3.	Validate profile changes before saving.
4.	Persist updates successfully.
5.	Prevent customers from accessing other customers' profiles.
## Acceptance Criteria
1.	Customers can view their account information.
2.	Customers can update permitted profile details successfully.
3.	Invalid profile updates display validation errors and are not saved.
4.	Customers can only view and modify their own profile information.
5.	Profile updates are reflected immediately after saving.
## Test Scenarios
- Scenario 1: View Profile
Given a customer is logged in
When they access their profile
Then their profile information is displayed
- Scenario 2: Update Profile
Given a customer is logged in
When valid profile changes are submitted
Then the updates are saved successfully
- Scenario 3: Invalid Profile Update
Given a customer is updating their profile
When invalid data is entered
Then validation errors are displayed

---
---

# KAN-18: Implement Customer Address Management
## Description
Customers should be able to save and manage delivery addresses for future orders.
### Why are we carrying this out?
Saved addresses streamline checkout and reduce data entry effort for returning customers.
### Work to complete
1.	Allow customers to create addresses.
2.	Allow customers to update addresses.
3.	Allow customers to delete addresses.
4.	Allow customers to select a default delivery address.
5.	Restrict address access to the owning customer.
## Acceptance Criteria
1.	Customers can add a new delivery address.
2.	Customers can edit existing delivery addresses.
3.	Customers can delete saved delivery addresses.
4.	Customers can designate one address as the default delivery address.
5.	Customers can only access their own addresses.
## Test Scenarios
- Scenario 1: Add Address
Given a customer is logged in
When a new address is submitted
Then the address is saved successfully
- Scenario 2: Edit Address
Given a saved address exists
When the customer updates the address
Then the changes are saved successfully
- Scenario 3: Delete Address
Given a saved address exists
When the customer deletes the address
Then the address is removed from their account

---
---

# KAN-19: Enforce Customer Data Authorisation
## Description
Customer data must only be accessible by the customer who owns it.
### Why are we carrying this out?
The platform must protect personal customer data, support GDPR compliance, and prevent unauthorised access.
### Work to complete
1.	Implement API-level ownership checks for customer resources.
2.	Restrict access to profiles, addresses, orders, and account data.
3.	Return HTTP 403 for unauthorised access attempts.
4.	Prevent direct URL manipulation or API requests from exposing another customer's information.
5.	Implement automated security tests covering access controls.
## Acceptance Criteria
1.	Customers can access their own profile, addresses, and order data.
2.	Requests for another customer's data return HTTP 403 Forbidden.
3.	API-level authorisation is enforced regardless of UI behaviour.
4.	Security testing confirms customers cannot access data belonging to another account.
5.	Customer data protection complies with platform security and GDPR requirements.
## Test Scenarios
- Scenario 1: Access Own Data
Given a customer is authenticated
When they request their own account data
Then the data is returned successfully
- Scenario 2: Access Another Customer's Data
Given a customer is authenticated
When they attempt to access another customer's data
Then the request is rejected with HTTP 403
- Scenario 3: Manipulated Request
Given a customer modifies request parameters manually
When another customer's data is requested
Then access is denied by the API

---
---

# KAN-20: Generate JWT Tokens for Authenticated Users
## Description
The system should generate a JWT token when a user successfully authenticates.
### Why are we carrying this out?
JWTs provide a secure mechanism for maintaining user authentication between requests without requiring users to submit their credentials repeatedly.
### Work to Complete
1.	Generate a JWT following successful user authentication.
2.	Include required user claims within the JWT.
3.	Return the JWT to the client upon successful authentication.
4.	Prevent JWT generation when authentication fails.
## Acceptance Criteria
1.	A JWT is generated following successful authentication.
2.	The JWT contains the required user claims.
3.	The JWT is returned to the client.
4.	No JWT is issued for failed authentication attempts.
5.	JWTs are generated using the application's configured signing key.
## Test Scenarios
- Scenario 1: Generate JWT Successfully
Given a user provides valid authentication credentials
When the authentication request is processed
Then a JWT is generated and returned to the client
- Scenario 2: Invalid Authentication Credentials
Given a user provides invalid authentication credentials
When the authentication request is processed
Then no JWT is generated and an authentication error is returned
- Scenario 3: JWT Contains Required Claims
Given a user successfully authenticates
When a JWT is generated
Then the token contains the required user claims
- Scenario 4: Missing Authentication Details
Given required authentication details are missing
When the authentication request is processed
Then no JWT is generated and an appropriate error message is returned

---
---

# KAN-21: Protect Backend Endpoints Using JWT Validation
## Description
The system should restrict access to protected backend endpoints by validating JWTs provided by authenticated users.
### Why are we carrying this out?
Protected endpoints ensure that only authenticated users can access secured resources and functionality within the application.
### Work to Complete
1.	Implement JWT validation for protected endpoints.
2.	Restrict access to requests without valid JWTs.
3.	Return appropriate responses for invalid or expired tokens.
4.	Allow access to protected resources when a valid JWT is supplied.
## Acceptance Criteria
1.	Protected endpoints require a valid JWT.
2.	Requests with valid JWTs are granted access.
3.	Requests with invalid JWTs are rejected.
4.	Requests with expired JWTs are rejected.
5.	Requests without JWTs receive an unauthorized response.
## Test Scenarios
- Scenario 1: Access Protected Endpoint with Valid JWT
Given a user has a valid JWT
When the user sends a request to a protected endpoint
Then access to the endpoint is granted
- Scenario 2: Access Protected Endpoint Without JWT
Given a user does not provide a JWT
When the user sends a request to a protected endpoint
Then an unauthorized response is returned
- Scenario 3: Access Protected Endpoint with Invalid JWT
Given a user provides an invalid JWT
When the user sends a request to a protected endpoint
Then access is denied and an unauthorized response is returned
- Scenario 4: Access Protected Endpoint with Expired JWT
Given a user provides an expired JWT
When the user sends a request to a protected endpoint
Then access is denied and an appropriate authorization error is returned
- Scenario 5: JWT Validation Failure
Given a JWT cannot be validated successfully
When a request is made to a protected endpoint
Then access is denied and the request is rejected appropriately

---
---

# KAN 22: Add Products to Shopping Cart
## Description
Customers should be able to add products to their shopping cart while browsing the catalogue. The cart should maintain selected products until checkout or removal.
### Why are we carrying this out?
Customers need a simple way to collect products they intend to purchase before proceeding to checkout.
### Work to complete
1.	Allow customers to add products to their cart from product listing and product detail pages.
2.	Add selected products with the chosen quantity.
3.	Prevent unavailable products from being added to the cart.
4.	Update the cart item count after products are added.
5.	Ensure cart information remains accurate and up to date.
## Acceptance Criteria
1.	A customer can add an available product to their shopping cart.
2.	Added products appear in the cart with the correct product information and quantity.
3.	A customer receives feedback confirming the item was added successfully.
4.	Out-of-stock products cannot be added to the cart.
5.	Cart updates meet the platform's performance and availability requirements.
## Test Scenarios
- Scenario 1: Add Product Successfully
Given a product is in stock
When a customer adds it to their cart
Then the product is added successfully
- Scenario 2: Add Out-of-Stock Product
Given a product is out of stock
When a customer attempts to add it to their cart
Then the product is not added
- Scenario 3: Verify Cart Contents
Given a product has been added to the cart
When the customer views their cart
Then the correct product details and quantity are displayed

---
---

# KAN-23: Remove Products from Shopping Cart
## Description
Customers should be able to remove unwanted items from their shopping cart before checkout.
### Why are we carrying this out?
Customers may change their purchase decisions and need the ability to manage cart contents.
### Work to complete
1.	Allow customers to remove items from the cart.
2.	Update the cart totals after item removal.
3.	Refresh the cart display immediately after removal.
4.	Display an empty-cart state when no items remain.
## Acceptance Criteria
1.	Customers can remove items from the shopping cart.
2.	Removed items no longer appear in the cart.
3.	Cart subtotal updates correctly after removal.
4.	An appropriate message is displayed when the cart is empty.
## Test Scenarios
- Scenario 1: Remove Item
Given a product exists in the cart
When the customer removes the item
Then the product no longer appears in the cart
- Scenario 2: Update Totals
Given multiple products exist in the cart
When one item is removed
Then the subtotal is recalculated correctly
- Scenario 3: Empty Cart
Given only one item exists in the cart
When the item is removed
Then the empty cart message is displayed

---
---

# KAN-24: Update Cart Item Quantities
## Description
Customers should be able to increase or decrease the quantity of products in their cart before completing checkout.
### Why are we carrying this out?
Customers often purchase multiple units of a product and need flexibility to adjust quantities before ordering.
### Work to complete
1.	Allow customers to increase product quantities.
2.	Allow customers to decrease product quantities.
3.	Validate that requested quantities do not exceed available stock.
4.	Recalculate cart totals when quantities change.
5.	Update the cart display immediately.
## Acceptance Criteria
1.	Customers can update product quantities in the cart.
2.	Cart totals are recalculated when quantities are changed.
3.	Quantities cannot exceed available stock.
4.	Quantity updates are reflected immediately in the cart.
## Test Scenarios
- Scenario 1: Increase Quantity
Given a product exists in the cart
When the customer increases the quantity
Then the cart updates successfully
- Scenario 2: Decrease Quantity
Given a product exists in the cart
When the customer decreases the quantity
Then the updated quantity is displayed
- Scenario 3: Exceed Stock
Given stock is limited
When the customer requests a quantity greater than available stock
Then the update is rejected with an appropriate message

---
---

# KAN-25: Persist Shopping Cart Across Sessions
## Description
Cart contents should remain available when customers return to the website after closing their browser or ending their session.
### Why are we carrying this out?
Customers may shop over multiple visits and expect previously selected products to remain in their cart.
### Work to complete
1.	Persist cart contents across customer sessions.
2.	Restore cart contents when customers return.
3.	Ensure cart data is associated with the correct customer account.
4.	Prevent unauthorised access to another customer's cart.
## Acceptance Criteria
1.	Products remain in the cart after the customer logs out and logs back in.
2.	Products remain in the cart after the browser is closed and reopened.
3.	Customers can only access their own cart.
4.	Cart data remains accurate after restoration.
## Test Scenarios
- Scenario 1: Return After Login
Given products exist in a customer's cart
When the customer logs out and logs back in
Then the cart contents are restored
- Scenario 2: Return After Browser Restart
Given products exist in a customer's cart
When the browser is closed and reopened
Then the cart contents are retained
- Scenario 3: Customer Isolation
Given multiple customers have accounts
When a customer views their cart
Then only their own cart contents are displayed

---
---

# KAN-26: Display Cart Subtotal and Estimated Shipping Costs
## Description
Customers should be able to view the current cart subtotal and estimated shipping costs before proceeding to checkout.
### Why are we carrying this out?
Customers want visibility of expected costs before starting the checkout process.
### Work to complete
1.	Calculate and display the cart subtotal.
2.	Calculate and display estimated shipping costs.
3.	Update totals when cart contents change.
4.	Ensure displayed values are accurate.
## Acceptance Criteria
1.	The cart displays the current subtotal of all items.
2.	The cart displays estimated shipping costs.
3.	Totals update whenever items or quantities are changed.
4.	Cost calculations use accurate cart data.
## Test Scenarios
- Scenario 1: Display Subtotal
Given products exist in the cart
When the cart page is viewed
Then the correct subtotal is displayed
- Scenario 2: Display Shipping Estimate
Given products exist in the cart
When the cart page is viewed
Then an estimated shipping cost is displayed
- Scenario 3: Recalculate Totals
Given a customer updates their cart
When quantities or products change
Then the subtotal and shipping estimate are recalculated correctly

---
---

# KAN-27: Implement Checkout and Order Placement
## Description
Customers should be able to submit an order for the items currently in their shopping basket. The system should verify that sufficient stock is available for all items before creating the order. Successful orders should be stored and display an order confirmation screen.
### Why are we carrying this out?
Customers need the ability to complete purchases through the platform. Order placement is a core business capability that allows customer purchases to be recorded, inventory to be managed, and confirmation to be provided once an order has been successfully placed.
### Work to complete
1.	Allow customers to submit an order for the items in their shopping basket.
2.	Validate that sufficient stock exists for all items before creating the order.
3.	Create and store an order when stock validation succeeds.
4.	Reduce available stock quantities when an order is placed successfully.
5.	Prevent order creation when stock is insufficient.
6.	Display an appropriate error message when an order cannot be placed due to insufficient stock.
7.	Display an order confirmation screen when an order is placed successfully.
8.	Meet the stated performance, availability, and scalability requirements.
## Acceptance Criteria
1.	A customer can place an order when sufficient stock exists for all items in their basket.
2.	Successfully placed orders are stored and assigned a unique order reference.
3.	Available stock is reduced when an order is placed successfully.
4.	Orders containing items with insufficient stock are rejected and no order is created.
5.	Customers are shown an appropriate message when an order fails due to insufficient stock.
6.	Customers are shown an order confirmation screen after a successful order placement.
7.	Order placement requests complete successfully while meeting the platform's performance, availability, and scalability requirements.
## Test Scenarios
- Scenario 1: Successful Order Placement
Given a customer has items in their basket and sufficient stock exists
When the customer submits the order
Then the order is created successfully and a confirmation screen is displayed
- Scenario 2: Insufficient Stock
Given a customer has an item in their basket with insufficient stock available
When the customer submits the order
Then the order is rejected and an appropriate error message is displayed
- Scenario 3: Order Stored Successfully
Given a customer submits a valid order
When order processing completes successfully
Then the order details are stored and assigned a unique order reference

---
---

# KAN-28: Validate Stock During Checkout
## Description
The system should verify that sufficient stock is available for all items in a customer's basket before an order is created. Orders must not be placed if any item does not have enough available stock.
### Why are we carrying this out?
Stock validation prevents customers from purchasing items that are unavailable and helps maintain accurate inventory levels. This ensures orders can only be placed when the required products are in stock.
### Work to complete
1.	Check stock availability for all items when checkout is submitted.
2.	Compare requested quantities against available stock levels.
3.	Prevent order creation if insufficient stock exists for any item.
4.	Display an appropriate error message when stock is unavailable.
5.	Ensure no stock changes are made when an order fails validation.
6.	Meet the stated performance, availability, and scalability requirements.
## Acceptance Criteria
1.	The system validates stock availability before creating an order.
2.	Orders are created only when sufficient stock exists for all items.
3.	Orders containing one or more out-of-stock items are rejected.
4.	Customers receive an appropriate error message when an order cannot be placed due to insufficient stock.
5.	No stock quantities are modified when an order fails validation.
6.	Stock validation requests complete successfully while meeting the platform's performance, availability, and scalability requirements.
## Test Scenarios
- Scenario 1: Sufficient Stock Available
Given a customer has items in their basket
And sufficient stock exists for all items
When the customer submits checkout
Then stock validation passes
- Scenario 2: Insufficient Stock Available
Given a customer has an item in their basket with insufficient stock available
When the customer submits checkout
Then the order is rejected and an appropriate error message is displayed
- Scenario 3: Mixed Stock Availability
Given a customer has multiple items in their basket
And at least one item does not have sufficient stock
When the customer submits checkout
Then the order is rejected and no order is created

---
---

# KAN-29: View Order History
## Description
Customers should be able to view a list of their previous orders after logging into their account. The order history should display all orders associated with the customer's account.
### Why are we carrying this out?
Customers need visibility of their previous purchases so they can review what they have ordered. Providing access to order history improves the customer experience and allows customers to track their purchasing activity.
### Work to complete
1.	Allow authenticated customers to access their order history.
2.	Retrieve all orders associated with the customer's account.
3.	Display a list of previous orders.
4.	Ensure customers can only view their own orders.
5.	Display an appropriate message when no orders exist.
6.	Meet the stated performance, availability, and scalability requirements.
## Acceptance Criteria
1.	An authenticated customer can view their previous orders.
2.	Only orders belonging to the authenticated customer are displayed.
3.	Customers with no previous orders are shown an appropriate message.
4.	Unauthenticated users cannot access order history.
5.	Order history requests complete successfully while meeting the platform's performance, availability, and scalability requirements.
## Test Scenarios
- Scenario 1: View Existing Order History
Given a customer has previously placed orders
When they view their order history
Then all of their previous orders are displayed
- Scenario 2: No Previous Orders
Given a customer has not placed any orders
When they view their order history
Then an appropriate message is displayed indicating no orders exist
- Scenario 3: Customer Isolation
Given multiple customers have placed orders
When a customer views their order history
Then only their own orders are displayed

---
---

# KAN-30: View Order Details
## Description
Customers should be able to view the products contained within a previous order. Order details should display the items that were purchased as part of the selected order.
### Why are we carrying this out?
Customers need to see what products were included in a specific order. This provides transparency and allows customers to review previous purchases.
### Work to complete
1.	Allow customers to select an order from their order history.
2.	Retrieve the details of the selected order.
3.	Display the products associated with the order.
4.	Display the quantity of each product ordered.
5.	Ensure customers can only view details for their own orders.
6.	Meet the stated performance, availability, and scalability requirements.
## Acceptance Criteria
1.	Customers can view the details of a previous order.
2.	The products associated with the selected order are displayed.
3.	The quantity of each ordered product is displayed.
4.	Customers cannot view the details of another customer's orders.
5.	Order detail requests complete successfully while meeting the platform's performance, availability, and scalability requirements.
## Test Scenarios
- Scenario 1: View Order Details
Given a customer has a previous order
When they select the order from their order history
Then the products in that order are displayed
- Scenario 2: Multiple Products
Given an order contains multiple products
When the customer views the order details
Then all products and quantities are displayed
- Scenario 3: Unauthorised Access
Given an order belongs to another customer
When access to that order is attempted
Then access is denied

---
---

# KAN-31: Improve Catalogue Performance Through Caching
## Description
Customers should be able to browse products and search the catalogue with fast response times, even during periods of high traffic. Frequently accessed catalogue data should be cached to reduce database load and improve application performance.
### Why are we carrying this out?
Customers expect product information and search results to be returned quickly. Caching frequently accessed catalogue data improves performance, supports concurrent users, and helps the platform handle traffic spikes while meeting performance requirements.
### Work to complete
1.	Cache frequently accessed catalogue product data.
2.	Cache frequently executed product searches where appropriate.
3.	Retrieve data from cache when available.
4.	Refresh cached data when products are added, updated, or removed.
5.	Fall back to the database when cached data is unavailable.
6.	Ensure product information remains accurate and consistent.
7.	Meet catalogue browsing and search performance requirements.
## Acceptance Criteria
1.	Product listing pages load within the required 2-second performance target.
2.	Product search results are returned within the required 1-second performance target.
3.	Product information returned from cache matches current catalogue data.
4.	Changes to product details are reflected after cache refresh.
5.	Customers can continue browsing and searching products if cached data becomes unavailable.
6.	The solution supports expected concurrent-user and traffic-spike requirements.
## Test Scenarios
- Scenario 1: Browse Products
Given catalogue products exist
When a customer views a product listing page
Then products are displayed within the required performance target
- Scenario 2: Search Products
Given matching catalogue products exist
When a customer performs a product search
Then relevant results are returned within the required performance target
- Scenario 3: Updated Product Information
Given a product's details have been updated
When a customer views or searches for the product
Then the updated product information is displayed correctly
- Scenario 4: Cache Unavailable
Given cached data is unavailable
When a customer browses or searches products
Then product information is retrieved successfully and remains available

---
---

# KAN-32: Create Homepage
## Description
Customers should be presented with a basic homepage when they access the website. The homepage will act as the main landing page and provide a starting point for navigating the application.
### Why are we carrying this out?
A homepage provides customers with a clear entry point into the application and establishes a foundation for future content and navigation.
### Work to Complete
1.	Create a homepage accessible from the root URL.
2.	Display a homepage title or welcome message.
3.	Display basic branding for the application.
4.	Provide navigation to key areas of the website.
5.	Ensure the homepage loads successfully.
## Acceptance Criteria
1.	A homepage is displayed when a customer accesses the website.
2.	The homepage contains a title or welcome message.
3.	Basic branding is displayed on the homepage.
4.	Navigation links are available to the customer.
5.	The homepage loads without errors.
6.	The homepage is accessible to all users without authentication.

---
---

# KAN-33: Create Shopping Cart
## Description
Customers should be able to view and manage the contents of their shopping cart before proceeding to checkout. The shopping cart should display all selected products, quantities, pricing information, and allow customers to update or remove items as needed.
### Why are we carrying this out?
Customers need a clear and convenient way to review and manage the products they intend to purchase before completing their order.
### Work to Complete
1. Create a shopping cart page that displays all items added to the cart.
2. Display product name, price, quantity, and subtotal for each cart item.
3. Allow customers to update product quantities within the cart.
4. Allow customers to remove products from the cart.
5. Display the total cost of all items in the cart.
6. Show an appropriate message when the cart is empty.
7. Ensure cart information updates correctly when quantities are changed or items are removed.
## Acceptance Criteria
1. A customer can view all products currently added to their shopping cart.
2. Each cart item displays the correct product information, quantity, and pricing.
3. A customer can update the quantity of a cart item.
4. A customer can remove a product from the cart.
5. The cart total updates automatically when quantities change or items are removed.
7. An empty cart message is displayed when no products exist in the cart.
8. Cart updates meet the platform's performance and availability requirements.
## Test Scenarios
- Scenario 1: View Cart Contents
Given products have been added to the cart
When the customer views their cart
Then all products are displayed with the correct details, quantities, and prices
- Scenario 2: Update Product Quantity
Given a product exists in the cart
When the customer changes the quantity
Then the cart updates with the new quantity and correct pricing
- Scenario 3: Remove Product from Cart
Given a product exists in the cart
When the customer removes the product
Then the product is removed and the cart total is updated
- Scenario 4: Verify Cart Total Calculation
Given multiple products exist in the cart
When the customer views the cart total
Then the total reflects the combined value of all cart items
- Scenario 5: Empty Cart
Given no products exist in the cart
When the customer navigates to the cart page
Then an empty cart message is displayed
- Scenario 6: Remove Last Item from Cart
Given only one product exists in the cart
When the customer removes the product
Then the cart becomes empty and the empty cart message is displayed

---
---
