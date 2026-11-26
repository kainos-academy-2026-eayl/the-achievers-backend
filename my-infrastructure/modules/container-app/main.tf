resource "azurerm_container_app" "this" {
  name                         = var.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.container_app_environment_id
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }

  registry {
    server   = var.registry_server
    identity = var.identity_id
  }

  # Values stay in Key Vault; the app only stores a reference to them.
  dynamic "secret" {
    for_each = var.key_vault_secrets
    content {
      name                = secret.key
      key_vault_secret_id = secret.value
      identity            = var.identity_id
    }
  }

  ingress {
    external_enabled = var.external_enabled
    target_port      = var.target_port

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = var.name
      image  = var.image
      cpu    = var.cpu
      memory = var.memory

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name        = env.key
          secret_name = env.value
        }
      }
    }

    dynamic "volume" {
      for_each = var.postgres_enabled ? [1] : []
      content {
        name         = "postgres-data"
        storage_type = "EmptyDir"
      }
    }

    dynamic "container" {
      for_each = var.postgres_enabled ? [1] : []
      content {
        name   = "postgres"
        image  = "docker.io/library/postgres:17-alpine"
        cpu    = 0.25
        memory = "0.5Gi"

        volume_mounts {
          name = "postgres-data"
          path = "/var/lib/postgresql/data"
        }

        env {
          name  = "POSTGRES_USER"
          value = "appuser"
        }

        env {
          name  = "POSTGRES_DB"
          value = "app_dev"
        }

        env {
          name        = "POSTGRES_PASSWORD"
          secret_name = "db-admin-password"
        }
      }
    }
  }
}
