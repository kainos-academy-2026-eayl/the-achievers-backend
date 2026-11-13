terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    use_cli              = true
    use_azuread_auth     = true
    resource_group_name  = "rg-achievers-backend-tfstate-dev"
    storage_account_name = "stachieversdevstate123"
    container_name       = "tfstate"
    key                  = "achievers-backend-dev.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = "ca3b1116-a974-4549-88c2-8b56da5130d0"
}

moved {
  from = azurerm_resource_group.main
  to   = module.resource_group.azurerm_resource_group.this
}

module "resource_group" {
  source              = "./modules/resource-group"
  resource_group_name = var.resource_group_name
  location            = var.location
}
