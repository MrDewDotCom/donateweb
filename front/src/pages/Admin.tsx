import { useEffect, useState } from "react";
import axios from "axios";
import type { Donation } from "../types/donation";

export default function AdminPage() {
    const [donations, setDonations] = useState<Donation[]>([]);

    const loadDonations = async () => {
        const res = await axios.get(
            "http://localhost:3000/donations"
        );

        setDonations(res.data);
    };

    const markAsPaid = async (id: number) => {
        await axios.patch(
            `http://localhost:3000/donations/${id}`,
            {
                status: "paid",
            }

        );

        loadDonations();
    };

    useEffect(() => {
        loadDonations();
    }, []);

    return (
        <div>
            <h1>Admin Dashboard</h1>

            {donations.map((d: any) => (
                <div key={d.id}>
                    <p>{d.name}</p>
                    <p>{d.amount} บาท</p>
                    <p>{d.status}</p>
                    <button
                        onClick={() => markAsPaid(d.id)}
                    >
                        Mark as Paid
                    </button>
                </div>
            ))}
        </div>
    );
}