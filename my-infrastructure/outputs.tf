output "resource_group_name" {
  description = "Name of the resource group."
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Azure region of the resource group."
  value       = azurerm_resource_group.main.location
}

output "resource_group_id" {
  description = "Full Azure ID of the resource group."
  value       = azurerm_resource_group.main.id
}