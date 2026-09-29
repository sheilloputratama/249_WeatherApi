const path = require("path");
require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public"), { index: "index .html" }));

// Ambil jenis wilayah dari id ("region.123" -> "region") atau dari field kind
const tipe = (c) => (c.id ? String(c.id).split(".")[0] : c.kind || "");

const TIPE_KECAMATAN = ["municipal_district", "municipality", "district", "localadmin", "county", "subregion"];

app.get("/api/lokasi", async (req, res) => {
    const query = (req.query.q || "").trim() || "Bandung";
    const apiKey = process.env.MAPTILER_API_KEY;
    const baseUrl = process.env.MAPTILER_BASE_URL || "https://api.maptiler.com/geocoding";

    const url = `${baseUrl}/${encodeURIComponent(query)}.json`;

    try {
        const response = await axios.get(url, { params: { key: apiKey, language: "id" } });
        const feature = response.data.features[0];

        if (!feature) {
            return res.status(404).json({ message: "Lokasi tidak ditemukan" });
        }

        const [longitude, latitude] = feature.center || feature.geometry.coordinates;

        // Gabungkan fitur itu sendiri + context-nya (hasil pencarian bisa berupa kota, provinsi, dll.)
        const semua = [{ id: feature.id, kind: feature.place_type?.[0], text: feature.text }, ...(feature.context || [])];

        let negara = "";
        let provinsi = "";
        let kecamatan = "";

        for (const c of semua) {
            const t = tipe(c);
            if (t === "country") negara = negara || c.text;
            else if (t === "region") provinsi = provinsi || c.text;
        }
        for (const t of TIPE_KECAMATAN) {
            const ketemu = semua.find((c) => tipe(c) === t);
            if (ketemu) { kecamatan = ketemu.text; break; }
        }

        res.json({
            lokasi: feature.place_name || feature.text,
            negara,
            provinsi,
            kecamatan,
            longitude,
            latitude
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Gagal mengambil data dari MapTiler" });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
