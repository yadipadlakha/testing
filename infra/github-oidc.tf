# Lets GitHub Actions assume an AWS role without storing any long-lived
# AWS access keys as GitHub secrets. See:
# https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only workflow runs triggered from this exact repo (any branch/PR) may
    # assume the role. Tighten to ":ref:refs/heads/${var.deploy_branch}" if
    # you want to restrict it to pushes on the deploy branch only.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_owner_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name               = "${var.app_name}-${var.environment}-github-actions-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json

  tags = {
    Name        = "${var.app_name}-${var.environment}-github-actions-deploy"
    Environment = var.environment
  }
}

data "aws_iam_policy_document" "github_actions_permissions" {
  statement {
    sid    = "TriggerAmplifyDeploys"
    effect = "Allow"
    actions = [
      "amplify:StartJob",
      "amplify:GetJob",
      "amplify:ListJobs",
      "amplify:GetApp",
      "amplify:GetBranch",
    ]
    resources = [
      aws_amplify_app.app.arn,
      "${aws_amplify_app.app.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name   = "amplify-deploy"
  role   = aws_iam_role.github_actions_deploy.id
  policy = data.aws_iam_policy_document.github_actions_permissions.json
}
