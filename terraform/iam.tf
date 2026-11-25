data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "api_task" {
  name               = "${local.name}-api-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_policy" "api_sqs" {
  name        = "${local.name}-api-sqs"
  description = "Queue access used by the API when it creates refunds"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.refund_jobs.arn
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_sqs" {
  role       = aws_iam_role.api_task.name
  policy_arn = aws_iam_policy.api_sqs.arn
}

resource "aws_iam_role" "worker_task" {
  name               = "${local.name}-worker-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_policy" "worker_sqs" {
  name        = "${local.name}-worker-sqs"
  description = "Queue access used by the refund worker"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ]
        Resource = aws_sqs_queue.refund_jobs.arn
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "worker_sqs" {
  role       = aws_iam_role.worker_task.name
  policy_arn = aws_iam_policy.worker_sqs.arn
}
