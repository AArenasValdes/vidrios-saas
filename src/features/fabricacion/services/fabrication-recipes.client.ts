import { createClient } from "@/lib/supabase/client";
import { createFabricationRecipeTestsRepository } from "@/features/fabricacion/repositories/fabrication-recipe-tests.repository";
import { createFabricationRecipesRepository } from "@/features/fabricacion/repositories/fabrication-recipes.repository";
import { createFabricationRecipesService } from "@/features/fabricacion/services/fabrication-recipes.service";

let clientService: ReturnType<typeof createFabricationRecipesService> | null = null;

export function getFabricationRecipesClientService() {
  if (clientService) return clientService;

  const supabase = createClient();
  clientService = createFabricationRecipesService({
    recipesRepository: createFabricationRecipesRepository(supabase),
    testsRepository: createFabricationRecipeTestsRepository(supabase),
  });
  return clientService;
}
