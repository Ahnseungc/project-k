from __future__ import annotations

from gse.models.types import CalibrationBundle, PolarimetricObservations, ViewCapture
from gse.obs.stokes import diffuse_obs, diffuse_pol_alpha, specular_dominant


def build_observations(
    view: ViewCapture,
    hdr_channels: dict[str, object],
) -> PolarimetricObservations:
    I0 = hdr_channels["I0"]
    I90 = hdr_channels["I90"]
    I45 = hdr_channels["I45"]
    I135 = hdr_channels["I135"]
    return PolarimetricObservations(
        view_index=view.view_index,
        I_d=diffuse_obs(I90),
        I_alpha=diffuse_pol_alpha(I45, I135),
        I_s=specular_dominant(I0, I90),
        hdr_radiance=hdr_channels,  # type: ignore[arg-type]
    )
