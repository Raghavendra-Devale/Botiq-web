# Botiq Web - Dead Code & Refactoring Report

Because deep AST (Abstract Syntax Tree) static analysis tools like `ts-prune` require a running Node environment which is restricted in this isolated Windows workflow, I have manually analyzed the files and components we have interacted with. 

Here is a report outlining dead code, unused methods, and boilerplate stubs currently sitting in the application, explicitly excluding `dashboard-v2`.

## 1. `order-list.component.ts` (Stub Methods)
The Order List component contains several unlinked, dead, or purely aesthetic placeholder methods that do not execute real logic:

* **`exportOrders()`**
  * **Status:** Dead Stub
  * **Line ~16:** Currently just runs `console.log("export orders as csv or pdf");`. The popover menu `<button (click)="exportOrders()">` exists in the HTML, but visually clicking it does nothing for the user.
* **`goBack()`**
  * **Status:** Unused
  * **Line ~78:** Contains `console.log('Navigate to dashboard');`. The actual routing logic (`this.router.navigate(['/dashboard'])`) is missing, and the HTML doesn't seem to invoke it.
* **`dismissNote(id: number)`**
  * **Status:** Dead Stub
  * **Line ~151:** Currently just runs `console.log('Dismiss note:', id);`. Does not actually remove the note array from memory.
* **`getImages(order: any)`**
  * **Status:** Static Stub
  * **Line ~171:** Unconditionally returns `'assets/images/noimge.jpg'`. The parameter `order` is never inspected, dead-ending any dynamic image logic.
* **`getStatusClass()`**
  * **Status:** Empty Return
  * **Line ~175:** Hardcoded to return an empty string `''`.

## 2. `OrderestateService` (`orderestate.service.ts`)
* **Status:** Highly Suspect (Potentially Dead)
* **Reason:** This is a minuscule 18-line service holding a single `private orderData: any;` object and simple getter/setters. Typically, this is an artifact of early development used to pass data between un-linked components without using proper Angular Routing state. If no component is actively injecting `OrderestateService` to fetch state, this file should be safely deleted.

## 3. `job-order-list.component.ts`
* **Status:** Incomplete Execution
* **Reason:** In `fetchJobOrders()`, it retrieves `this.orderService.getJobOrders()`. However, the methods mapped in `order-list.component.ts` (like transforming order details, searching, parsing dates) are entirely missing here. Unless `job-order-list` has its own HTML that blindly maps over `this.orders` using raw JSON strings, much of the standard logic is completely unported.

---

### 🚀 Recommended Next Steps to find 100% of Dead Code
Since I cannot run NPM scripts on your machine locally, I highly recommend you run an automated analysis tool across your entire Angular directory.

You can easily find every single dead import, unused Component, and unused Service by running this inside your `botiq-web` terminal:

```bash
# 1. Temporarily install ts-prune
npm install -g ts-prune

# 2. Run it ignoring the testing specifications
ts-prune --ignore "src/**/*.spec.ts"
```
This will instantly print a list of every TypeScript file, interface, component, and service that is sitting completely dead in your codebase.
