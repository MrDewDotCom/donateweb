import { useEffect, useState } from "react";
import type { Donation } from "../types/donation";
import { getDonations, markDonationAsPaid, } from "../services/donation.service";
import SettingsPanel from "../components/SettingsPanel";
import { API_URL } from "../config/api";

export default function AdminPage() {
    const [donations, setDonations] =
        useState<Donation[]>([]);

    const loadDonations = async () => {
        const res = await getDonations();

        setDonations(res.data);
    };

    const markAsPaid = async (id: number) => {
        await markDonationAsPaid(id);

        loadDonations();
    };

    useEffect(() => {
        loadDonations();
    }, []);

    return (
        <div>
            <h1>Admin Dashboard</h1>

            <SettingsPanel />

            {donations.map((d: any) => (
                <div key={d.id}>
                    <p>{d.name}</p>
                    <p>{d.amount} บาท</p>
                    <p>{d.status}</p>
                    {
                        d.slipImage && (
                            <div>
                                <a href={`${API_URL}${d.slipImage}`}
                                    target="_blank" rel="noreferrer">
                                    View Slip
                                </a>
                            </div>
                        )
                    }
                    <button onClick={() => markAsPaid(d.id)}>
                        Mark as Paid
                    </button>
                </div>
            ))}
        </div>
    );
}