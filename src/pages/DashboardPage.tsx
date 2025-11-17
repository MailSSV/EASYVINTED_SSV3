{/* Actions mobile regroupées à droite */}
<div className="mt-3 flex items-center justify-end gap-3">
  <button
    onClick={() => navigate(`/articles/${article.id}/preview`)}
    className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
    title="Voir"
  >
    <Eye className="w-4 h-4" />
  </button>

  <button
    onClick={() => navigate(`/articles/${article.id}/edit`)}
    className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
    title="Modifier"
  >
    <Edit className="w-4 h-4" />
  </button>

  <div
    className="relative flex-shrink-0"
    ref={openMenuId === article.id ? mobileMenuRef : null}
  >
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === article.id ? null : article.id);
      }}
      className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
      title="Plus d'actions"
    >
      <MoreVertical className="w-4 h-4" />
    </button>

    {openMenuId === article.id && (
      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
        ... (menu mobile inchangé)
      </div>
    )}
  </div>
</div>
