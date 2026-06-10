# Coding Rules - Gym Access Control System (v1)

This document establishes the coding standards and quality metrics for frontend and backend TypeScript/Javascript development.

---

## 1. General TypeScript Standards

1. **Strict Type Safety**: `noImplicitAny: true` must be enabled. Avoid using the `any` type. Define interfaces or types for all payloads, states, and function responses.
2. **Explicit Return Types**: All NestJS controller methods and service methods must specify their return types.
3. **Module Imports**: Use absolute imports with path aliases where possible:
   - `@backend/*` or standard relative pathing mapping modules cleanly.
   - `@/*` for Vue frontend source directories.

---

## 2. Vue 3 Coding Standards

1. **Composition API**: Use `<script setup lang="ts">` for all new Vue components. Avoid Options API (`data`, `methods`, etc.).
2. **Single Responsibility Components**: Keep components under 300 lines of code. If a component exceeds this, split it into smaller, presentation-only components.
3. **Reactive Props**: Use `defineProps<{ ... }>()` and `defineEmits<{ ... }>()` to guarantee compile-time type checking for component interaction.
4. **Style Scope**: All components with custom CSS must use `<style scoped>`.

---

## 3. NestJS Coding Standards

1. **Async/Await**: All database operations or simulation timers must use `async/await`. Avoid synchronous blocking calls.
2. **Exception Filters**: Avoid letting database errors escape directly to the API client. Implement a global `HttpExceptionFilter` to convert Postgres errors into structured JSON responses.
3. **Validation Pipes**: Use `new ValidationPipe({ whitelist: true })` globally in `main.ts` to strip out undeclared payload properties.
4. **Environment Variables**: Never hardcode database secrets or JWT keys. Read them via the `@nestjs/config` package or standard `process.env`.
