variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "image_tag" {
  type    = string
  default = "0.4.0"
}

variable "api_desired_count" {
  type    = number
  default = 8
}

variable "worker_desired_count" {
  type    = number
  default = 2
}

variable "api_cpu" {
  type    = number
  default = 1024
}

variable "api_memory" {
  type    = number
  default = 2048
}

variable "worker_cpu" {
  type    = number
  default = 512
}

variable "worker_memory" {
  type    = number
  default = 1024
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "db_allocated_storage" {
  type    = number
  default = 100
}

variable "db_max_connections" {
  type    = number
  default = 200
}

variable "db_reserved_connections" {
  type    = number
  default = 3
}

variable "queue_visibility_timeout_seconds" {
  type    = number
  default = 30
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "payments_base_url" {
  type    = string
  default = "https://payments.internal"
}

variable "model_base_url" {
  type    = string
  default = "https://model.internal"
}
