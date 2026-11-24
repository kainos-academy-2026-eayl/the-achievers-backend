terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Remaining settings are supplied per environment at init time:
  #   terraform init -backend-config=environments/<env>.backend.hcl
  backend "azurerm" {
    use_azuread_auth = true
  }
}

# Subscription and credentials come from ARM_* environment variables
# (OIDC service principal in CI, Azure CLI locally).
provider "azurerm" {
  features {}
}

locals {
  backend_resource_group_name  = "rg-${var.project}-backend-${var.environment}"
  frontend_resource_group_name = "rg-${var.project}-frontend-${var.environment}"
  key_vault_name               = "kv-${var.project}-${var.environment}"
}

moved {
  from = azurerm_resource_group.main
  to   = module.resource_group.azurerm_resource_group.this
}

module "resource_group" {
  source              = "./modules/resource-group"
  resource_group_name = local.backend_resource_group_name
  location            = var.location
}
module "frontend_resource_group" {
  source              = "./modules/resource-group"
  resource_group_name = local.frontend_resource_group_name
  location            = var.location
}
# Secrets are added manually in the portal, never in Terraform.
module "key_vault" {
  source              = "./modules/key-vault"
  key_vault_name      = local.key_vault_name
  resource_group_name = module.resource_group.resource_group_name
  location            = var.location
}
