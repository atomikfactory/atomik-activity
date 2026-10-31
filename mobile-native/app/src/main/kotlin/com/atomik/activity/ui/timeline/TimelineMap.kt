package com.atomik.activity.ui.timeline

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.view.ViewGroup
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.atomik.activity.data.network.dto.TrackingPoint
import com.google.android.gms.location.LocationServices
import org.osmdroid.tileprovider.tilesource.XYTileSource
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.CustomZoomButtonsController
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.CopyrightOverlay
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Overlay
import org.osmdroid.views.overlay.Polyline
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay

// Standard OpenStreetMap tiles. CARTO's basemaps now watermark every keyless request
// ("API KEY REQUIRED"), so they can't be used without an account. OSM needs no key,
// only an identifying User-Agent (set in AtomikApp). Tiles are 256 px; the map view
// scales them to screen density (`isTilesScaledToDpi`) so labels stay readable.
private val OSM_STANDARD = XYTileSource(
    "OpenStreetMap",
    0, 19, 256, ".png",
    arrayOf("https://tile.openstreetmap.org/"),
    "© OpenStreetMap contributors",
)

// Never zoom closer than this when fitting a track: a stationary day (all points
// within a few metres) would otherwise zoom to the tile source's max level.
private const val MAX_FIT_ZOOM = 17.0
private const val DEFAULT_ZOOM = 15.5

@Composable
fun TimelineMap(
    points: List<TrackingPoint>,
    modifier: Modifier = Modifier,
) {
    val context        = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val mapView = remember {
        // osmdroid Configuration is initialized in AtomikApp.onCreate()
        MapView(context).apply {
            // Explicit MATCH_PARENT so the view fills the Compose container.
            // Without this, osmdroid renders at zero/wrap size regardless of the Modifier.
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            setTileSource(OSM_STANDARD)
            isTilesScaledToDpi = true
            setMultiTouchControls(true)
            zoomController.setVisibility(CustomZoomButtonsController.Visibility.NEVER)
            isHorizontalMapRepetitionEnabled = false
            isVerticalMapRepetitionEnabled   = false
            minZoomLevel = 3.0
            maxZoomLevel = 19.0
            controller.setZoom(DEFAULT_ZOOM)
            overlays.add(CopyrightOverlay(context))
        }
    }

    // Live "my location" overlay (blue dot). Kept separately from the track overlays
    // so redrawing the track for a new day doesn't remove it.
    val myLocOverlay = remember {
        MyLocationNewOverlay(GpsMyLocationProvider(context), mapView).also {
            mapView.overlays.add(it)
        }
    }

    // Track overlays (polyline + start/end markers) currently on the map.
    val trackOverlays = remember { mutableListOf<Overlay>() }
    val currentPoints by rememberUpdatedState(points)

    // Follow the host lifecycle: osmdroid needs onResume/onPause to start/stop tile
    // loading and the GPS overlay, and onDetach to release its tile threads.
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> { mapView.onResume(); myLocOverlay.enableMyLocation() }
                Lifecycle.Event.ON_PAUSE  -> { myLocOverlay.disableMyLocation(); mapView.onPause() }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            myLocOverlay.disableMyLocation()
            mapView.onPause()
            mapView.onDetach()
        }
    }

    // Seed the initial center from the device's last known fix so we don't open at
    // Null Island while the day's points are loading.
    LaunchedEffect(Unit) {
        val fineGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        if (fineGranted) {
            try {
                LocationServices.getFusedLocationProviderClient(context)
                    .lastLocation
                    .addOnSuccessListener { loc ->
                        if (loc != null && currentPoints.isEmpty()) {
                            mapView.controller.setZoom(DEFAULT_ZOOM)
                            mapView.controller.setCenter(GeoPoint(loc.latitude, loc.longitude))
                        }
                    }
            } catch (_: SecurityException) {}
        }
    }

    LaunchedEffect(points) {
        mapView.overlays.removeAll(trackOverlays)
        trackOverlays.clear()

        if (points.isNotEmpty()) {
            val geoPoints = points.map { GeoPoint(it.latitude, it.longitude) }

            trackOverlays += Polyline(mapView).apply {
                setPoints(geoPoints)
                outlinePaint.color = Color.parseColor("#007BFF")
                outlinePaint.strokeWidth = 6f * context.resources.displayMetrics.density
                outlinePaint.isAntiAlias = true
                setInfoWindow(null)
            }

            trackOverlays += Marker(mapView).apply {
                position = geoPoints.first()
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                title = "Start"
                setInfoWindow(null)
            }

            if (geoPoints.size > 1) {
                trackOverlays += Marker(mapView).apply {
                    position = geoPoints.last()
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                    title = "End"
                    setInfoWindow(null)
                }
            }

            // Insert below the location dot / copyright overlays.
            mapView.overlays.addAll(0, trackOverlays)
            fitTo(mapView, geoPoints)
        }
        mapView.invalidate()
    }

    AndroidView(
        factory  = { mapView },
        modifier = modifier,
    )
}

/**
 * Frames [geoPoints] on the map. zoomToBoundingBox() computes the zoom from the view
 * size, so it must run after layout — calling it on a 0x0 view zooms to a nonsense
 * level and the map shows no tiles.
 */
private fun fitTo(mapView: MapView, geoPoints: List<GeoPoint>) {
    val apply = {
        if (geoPoints.size == 1) {
            mapView.controller.setZoom(MAX_FIT_ZOOM - 1)
            mapView.controller.setCenter(geoPoints.first())
        } else {
            val box = BoundingBox.fromGeoPointsSafe(geoPoints)
            mapView.zoomToBoundingBox(box, false, (32 * mapView.context.resources.displayMetrics.density).toInt())
            if (mapView.zoomLevelDouble > MAX_FIT_ZOOM) {
                mapView.controller.setZoom(MAX_FIT_ZOOM)
                mapView.controller.setCenter(box.centerWithDateLine)
            }
        }
        mapView.invalidate()
    }
    if (mapView.width > 0 && mapView.height > 0) apply()
    else mapView.addOnFirstLayoutListener { _, _, _, _, _ -> apply() }
}
