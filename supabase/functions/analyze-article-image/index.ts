import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = "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";

interface AnalysisResult {
  title: string;
  description: string;
  brand: string;
  category: string;
  subcategory?: string;
  color: string;
  material?: string;
  size?: string;
  condition: string;
  season: string;
  suggestedPeriod?: string;
  estimatedPrice?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrls } = await req.json();
    console.log("Received imageUrls:", imageUrls);

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.error("Invalid imageUrls:", imageUrls);
      return new Response(
        JSON.stringify({ error: "Au moins une URL d'image est requise" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageContent = imageUrls.map((url: string) => ({
      type: "image_url",
      image_url: { url, detail: "high" },
    }));

    const userMessage = [
      {
        type: "text",
        text: `Tu es un expert en mode et vêtements qui analyse des photos pour Vinted.
Analyse la/les photo(s) et retourne UNIQUEMENT un objet JSON valide avec ces champs :
- title: titre accrocheur pour Vinted (max 60 caractères, mentionne la marque si visible)
- description: description détaillée et attractive en français (150-300 mots). Décris l'article, son style, ses particularités, son état. Sois persuasif et professionnel.
- brand: marque du produit (si visible, sinon "Non spécifié")
- category: catégorie principale parmi : tops, bottoms, dresses, outerwear, shoes, accessories, bags
- subcategory: sous-catégorie précise (ex: t-shirt, jeans, robe longue, veste en jean, baskets, etc.)
- color: couleur principale en français (choisis parmi: Noir, Marron, Gris, Beige, Fuchsia, Violet, Rouge, Jaune, Bleu, Vert, Orange, Blanc, Argenté, Doré, Multicolore, Kaki, Turquoise, Crème, Abricot, Corail, Bordeaux, Rose, Lila, Bleu clair, Marine, Vert foncé, Moutarde, Menthe, Transparence)
- material: matière principale en français (choisis parmi: Acier, Acrylique, Alpaga, Argent, Bambou, Bois, Cachemire, Caoutchouc, Carton, Coton, Cuir, Cuir synthétique, Cuir verni, Céramique, Daim, Denim, Dentelle, Duvet, Fausse fourrure, Feutre, Flanelle, Jute, Laine, Latex, Lin, Maille, Mohair, Mousse, Mousseline, Mérinos, Métal, Nylon, Néoprène, Or, Paille, Papier, Peluche, Pierre, Plastique, Polaire, Polyester, Porcelaine, Rotin, Satin, Sequin, Silicone, Soie, Toile, Tulle, Tweed, Velours, Velous côtelé, Verre, Viscose, Élasthanne). Si non identifiable, retourne null.
- size: taille si visible sur l'étiquette (S, M, L, XL, 36, 38, etc. sinon null)
- condition: état estimé parmi : new_with_tags, new_without_tags, very_good, good, satisfactory
- season: saison optimale pour vendre parmi : spring, summer, autumn, winter, all_seasons
- suggestedPeriod: période idéale pour vendre cet article (ex: "Mars - Mai", "Octobre - Décembre", "Toute l'année"). Base-toi sur la saison et le type d'article.
- estimatedPrice: prix estimé en euros basé sur la marque, l'état et le type d'article

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`,
      },
      ...imageContent,
    ];

    console.log("Sending request to OpenAI with", imageUrls.length, "images");

    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: userMessage,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: `Erreur de connexion OpenAI: ${fetchError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("OpenAI response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: `Erreur OpenAI (${response.status}): ${error.substring(0, 200)}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    console.log("OpenAI response content:", content);

    content = content.trim();
    if (content.startsWith("```json")) {
      content = content.substring(7);
    } else if (content.startsWith("```")) {
      content = content.substring(3);
    }
    if (content.endsWith("```")) {
      content = content.substring(0, content.length - 3);
    }
    content = content.trim();

    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      return new Response(
        JSON.stringify({ error: `Erreur de parsing: ${content.substring(0, 100)}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-article-image:", error);
    return new Response(
      JSON.stringify({ error: `Erreur serveur: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
