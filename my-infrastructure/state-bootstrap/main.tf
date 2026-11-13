terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = "ca3b1116-a974-4549-88c2-8b56da5130d0"
}

resource "azurerm_resource_group" "state" {
  name     = "rg-achievers-backend-tfstate-dev"
  location = "uksouth"
}
resource "azurerm_storage_account" "state" {
  name                     = "stachieversdevstate123"
  resource_group_name      = azurerm_resource_group.state.name
  location                 = azurerm_resource_group.state.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"
}