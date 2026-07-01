import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { createOnboardingChecklistRepository } from "@/features/onboarding/repositories/onboarding-checklist.repository";
import {
  resolveActivationFlowStatus,
  type ActivationFlowAction,
  resolveActivationCompletionSource,
  resolveActivationCompletionState,
} from "@/features/onboarding/services/onboarding-activation-flow.service";
import { createOnboardingChecklistService } from "@/features/onboarding/services/onboarding-checklist.service";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await resolveAuthenticatedRouteContext();

    if (context.profile.rol !== "admin" || !context.profile.organizationId) {
      return NextResponse.json({
        shouldRedirect: false,
        quoteCount: 0,
        activationState: null,
      });
    }

    const organizationId = context.profile.organizationId;
    const supabase = await createServerSupabaseClient();
    const repository = createOnboardingChecklistRepository({
      clientFactory: supabase as never,
    });

    let activationRecord;
    let quoteRows;
    try {
      [activationRecord, quoteRows] = await Promise.all([
        repository.getByStepKey(organizationId, "activation_complete"),
        repository.listQuoteStates(organizationId),
      ]);
    } catch (repoError) {
      throw repoError;
    }

    const status = resolveActivationFlowStatus({
      rol: context.profile.rol,
      quoteCount: quoteRows.length,
      activationRecord,
    });

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[API] /api/onboarding/activation/status", error);
    return NextResponse.json(
      { error: "No pudimos revisar el estado de activacion." },
      { status: 500 }
    );
  }
}

type ActivationPostBody = {
  action?: ActivationFlowAction;
};

export async function POST(request: Request) {
  try {
    const context = await resolveAuthenticatedRouteContext();

    if (context.profile.rol !== "admin" || !context.profile.organizationId) {
      return NextResponse.json({ error: "Acceso no permitido." }, { status: 403 });
    }

    let body: ActivationPostBody = {};

    try {
      body = (await request.json()) as ActivationPostBody;
    } catch {
      return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
    }

    const action = body.action;

    if (action !== "complete" && action !== "skip") {
      return NextResponse.json({ error: "Accion invalida." }, { status: 400 });
    }

    const organizationId = context.profile.organizationId;
    const supabase = await createServerSupabaseClient();
    const checklistService = createOnboardingChecklistService({
      clientFactory: supabase as never,
    });

    const record = await checklistService.markActivationFlow({
      organizationId,
      authUserId: context.user.id,
      completionSource: resolveActivationCompletionSource(action),
      estado: resolveActivationCompletionState(action),
      metadataJson: { source: "activation_flow" },
    });

    return NextResponse.json({
      ok: true,
      activationState: record.estado,
    });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[API] /api/onboarding/activation/status POST", error);
    return NextResponse.json(
      { error: "No pudimos guardar el estado de activacion." },
      { status: 500 }
    );
  }
}
