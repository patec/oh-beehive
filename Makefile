.PHONY: help build test run-tests clean dev

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build production bundle
	npm run build

dev: ## Start development server (run manually: make dev)
	@echo "Run: npm run dev"

test: ## Run all tests
	npx vitest run --passWithNoTests

run-tests: test ## Alias for test

clean: ## Remove build artifacts
	rm -rf .next out
